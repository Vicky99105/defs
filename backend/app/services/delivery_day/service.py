from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.models.api import DeliveryDayResponse, DeliveryDaySummary, ForecastSeries, Point
from app.models.domain import ForecastVersion
from app.services.delivery_day.contract import (
    MAX_DELIVERY_DATE,
    MIN_DELIVERY_DATE,
    DeliveryDateOutOfRange,
    NoForecastAvailable,
)
from app.services.forecast_selection.contract import ForecastSelectionService
from app.services.wind_data.contract import WindDataService

UK = ZoneInfo("Europe/London")


def _uk_day_bounds(day: date) -> tuple[datetime, datetime]:
    """00:00 to 24:00 UK time, as UTC. Handles 23- and 25-hour clock-change days."""
    start = datetime.combine(day, time(0), UK).astimezone(UTC)
    end = datetime.combine(day + timedelta(days=1), time(0), UK).astimezone(UTC)
    return start, end


def _point(version: ForecastVersion) -> Point:
    return Point(start_time=version.start_time.astimezone(UTC), mw=version.mw)


class DefaultDeliveryDayService:
    def __init__(self, wind_data: WindDataService, selection: ForecastSelectionService) -> None:
        self._wind_data = wind_data
        self._selection = selection

    async def delivery_day(self, delivery_date: date) -> DeliveryDayResponse:
        if not MIN_DELIVERY_DATE <= delivery_date <= MAX_DELIVERY_DATE:
            raise DeliveryDateOutOfRange(
                f"Delivery date must be between {MIN_DELIVERY_DATE.isoformat()} and "
                f"{MAX_DELIVERY_DATE.isoformat()}, got {delivery_date.isoformat()}."
            )
        cutoff = self._selection.decision_time(delivery_date)
        day_start, day_end = _uk_day_bounds(delivery_date)
        versions = await self._wind_data.forecast_versions(day_start, day_end, cutoff)
        chosen = self._selection.decision_forecast(versions, cutoff)
        if not chosen:
            raise NoForecastAvailable(
                f"Elexon has no wind forecast for {delivery_date.isoformat()} "
                "published before the decision time."
            )

        latest_points = [_point(chosen[hour]) for hour in sorted(chosen)]
        latest_publish = max(v.publish_time for v in chosen.values())

        by_publish: dict[datetime, list[ForecastVersion]] = defaultdict(list)
        for version in versions:
            if version.publish_time <= cutoff:
                by_publish[version.publish_time].append(version)
        earlier = [
            ForecastSeries(
                publish_time=publish.astimezone(UTC),
                points=[_point(v) for v in sorted(by_publish[publish], key=lambda v: v.start_time)],
            )
            for publish in sorted(by_publish)
            if publish != latest_publish
        ]

        return DeliveryDayResponse(
            delivery_date=delivery_date,
            decision_time=cutoff.astimezone(UTC),
            latest=ForecastSeries(
                publish_time=latest_publish.astimezone(UTC), points=latest_points
            ),
            earlier=earlier,
            summary=self._summary(chosen, versions, cutoff),
        )

    @staticmethod
    def _summary(
        chosen: dict[datetime, ForecastVersion],
        versions: list[ForecastVersion],
        cutoff: datetime,
    ) -> DeliveryDaySummary:
        hours = sorted(chosen)
        # max/min keep the first hour on ties, so the earliest hour wins.
        peak = max(hours, key=lambda h: chosen[h].mw)
        low = min(hours, key=lambda h: chosen[h].mw)

        first: dict[datetime, ForecastVersion] = {}
        for version in versions:
            if version.publish_time > cutoff:
                continue
            current = first.get(version.start_time)
            if current is None or version.publish_time < current.publish_time:
                first[version.start_time] = version
        revision = {h: chosen[h].mw - first[h].mw for h in hours}
        biggest = max(hours, key=lambda h: abs(revision[h]))

        return DeliveryDaySummary(
            peak=_point(chosen[peak]),
            low=_point(chosen[low]),
            biggest_revision=Point(start_time=biggest.astimezone(UTC), mw=revision[biggest]),
        )
