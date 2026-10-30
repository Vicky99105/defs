import asyncio
from collections import defaultdict
from collections.abc import Iterable
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.models.api import AccuracyKpis, AccuracyResponse, HourError, LeadTimeBucket, Period
from app.models.domain import ForecastVersion
from app.services.accuracy.contract import WINDOW_DAYS, InvalidAccuracyQuery, NoAccuracyData
from app.services.delivery_day.contract import (
    MAX_DELIVERY_DATE,
    MIN_DELIVERY_DATE,
    DeliveryDateOutOfRange,
)
from app.services.forecast_selection.contract import ForecastSelectionService
from app.services.wind_data.contract import WindDataService

UK = ZoneInfo("Europe/London")
LEAD_BUCKET_HOURS = 6
LEAD_BUCKET = timedelta(hours=LEAD_BUCKET_HOURS)
MAX_LEAD = timedelta(hours=48)


def _uk_midnight(day: date) -> datetime:
    return datetime.combine(day, time(0), UK).astimezone(UTC)


class DefaultAccuracyService:
    def __init__(self, wind_data: WindDataService, selection: ForecastSelectionService) -> None:
        self._wind_data = wind_data
        self._selection = selection

    async def report(
        self, delivery_date: date, window_days: int, hour: int | None
    ) -> AccuracyResponse:
        _validate(delivery_date, window_days, hour)
        window_to = delivery_date - timedelta(days=2)
        window_from = window_to - timedelta(days=window_days - 1)
        previous_to = window_from - timedelta(days=1)
        previous_from = previous_to - timedelta(days=window_days - 1)

        # Both periods come from one fetch. Every version up to the end of the window is
        # needed: the decision forecast picks one per day, the lead-time view uses all of them.
        targets_from = _uk_midnight(previous_from)
        targets_to = _uk_midnight(window_to + timedelta(days=1))
        actuals, versions = await asyncio.gather(
            self._wind_data.hourly_actuals(previous_from, window_to),
            self._wind_data.forecast_versions(targets_from, targets_to, targets_to),
        )
        decision = self._decision_forecasts(versions)

        matched = [
            HourError(
                start_time=start.astimezone(UTC),
                forecast_mw=decision[start],
                actual_mw=actuals[start],
                error_mw=decision[start] - actuals[start],
            )
            for start in sorted(decision)
            if start in actuals and (hour is None or start.astimezone(UK).hour == hour)
        ]
        hours = [h for h in matched if _uk_date(h) >= window_from]
        previous = [h for h in matched if _uk_date(h) < window_from]
        if not hours:
            raise NoAccuracyData(
                f"Elexon has no forecast and actual to compare between "
                f"{window_from.isoformat()} and {window_to.isoformat()}."
            )
        typical = _mean(abs(h.error_mw) for h in hours)
        previous_typical = _mean(abs(h.error_mw) for h in previous) if previous else None

        return AccuracyResponse(
            period=Period(from_=window_from, to=window_to, days=_days(hours)),
            previous_period=(
                Period(from_=previous_from, to=previous_to, days=_days(previous))
                if previous
                else None
            ),
            kpis=AccuracyKpis(
                typical_error_mw=typical,
                bias_mw=_mean(h.error_mw for h in hours),
                trend_mw=None if previous_typical is None else typical - previous_typical,
                previous_typical_error_mw=previous_typical,
            ),
            hours=hours,
            lead_time=_lead_time(hours, versions),
        )

    def _decision_forecasts(self, versions: list[ForecastVersion]) -> dict[datetime, float]:
        """Per hour, the decision forecast for that hour's own UK delivery day."""
        by_day: dict[date, list[ForecastVersion]] = defaultdict(list)
        for version in versions:
            by_day[version.start_time.astimezone(UK).date()].append(version)
        decision: dict[datetime, float] = {}
        for day, day_versions in by_day.items():
            cutoff = self._selection.decision_time(day)
            for start, chosen in self._selection.decision_forecast(day_versions, cutoff).items():
                decision[start] = chosen.mw
        return decision


def _validate(delivery_date: date, window_days: int, hour: int | None) -> None:
    if not MIN_DELIVERY_DATE <= delivery_date <= MAX_DELIVERY_DATE:
        raise DeliveryDateOutOfRange(
            f"Delivery date must be between {MIN_DELIVERY_DATE.isoformat()} and "
            f"{MAX_DELIVERY_DATE.isoformat()}, got {delivery_date.isoformat()}."
        )
    if window_days not in WINDOW_DAYS:
        raise InvalidAccuracyQuery(f"Window must be 7, 14 or 30 days, got {window_days}.")
    if hour is not None and not 0 <= hour <= 23:
        raise InvalidAccuracyQuery(f"Hour must be between 0 and 23, got {hour}.")


def _lead_time(hours: list[HourError], versions: list[ForecastVersion]) -> list[LeadTimeBucket]:
    """Error of every forecast version for the given hours, in 6-hour lead-time buckets
    from 0 to 48 h. A bucket covers [from_hours, to_hours). Empty buckets are left out."""
    actual = {h.start_time: h.actual_mw for h in hours}
    errors: dict[int, list[float]] = defaultdict(list)
    for version in versions:
        if version.start_time not in actual:
            continue
        lead = version.start_time - version.publish_time
        if lead < MAX_LEAD:
            from_hours = int(lead / LEAD_BUCKET) * LEAD_BUCKET_HOURS
            errors[from_hours].append(version.mw - actual[version.start_time])
    return [
        LeadTimeBucket(
            from_hours=from_hours,
            to_hours=from_hours + LEAD_BUCKET_HOURS,
            typical_error_mw=_mean(abs(e) for e in bucket),
            count=len(bucket),
        )
        for from_hours, bucket in sorted(errors.items())
    ]


def _mean(values: Iterable[float]) -> float:
    items = list(values)
    return sum(items) / len(items)


def _uk_date(hour: HourError) -> date:
    return hour.start_time.astimezone(UK).date()


def _days(hours: list[HourError]) -> int:
    return len({_uk_date(h) for h in hours})
