from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

import pytest

from app.models.api import HourError
from app.services.accuracy.contract import AccuracyService
from app.services.accuracy.service import DefaultAccuracyService
from app.services.forecast_selection.service import DefaultForecastSelectionService
from app.services.wind_data.service import DefaultWindDataService
from tests.fakes.elexon import FakeElexonClient, fixture_forecasts

GOLDEN_DAY = date(2026, 1, 15)
UK = ZoneInfo("Europe/London")


@pytest.fixture
def accuracy() -> AccuracyService:
    return DefaultAccuracyService(
        DefaultWindDataService(FakeElexonClient()), DefaultForecastSelectionService()
    )


@pytest.mark.anyio
async def test_golden_typical_error_15_jan_7_days(accuracy: AccuracyService) -> None:
    report = await accuracy.report(GOLDEN_DAY, 7, None)

    assert report.period.from_ == date(2026, 1, 7)
    assert report.period.to == date(2026, 1, 13)
    assert report.period.days == 7
    assert len(report.hours) == 168
    assert report.hours[0].start_time == datetime(2026, 1, 7, 0, 0, tzinfo=UTC)
    assert round(report.kpis.typical_error_mw) == 2354
    assert report.kpis.typical_error_mw == pytest.approx(
        sum(abs(h.error_mw) for h in report.hours) / 168
    )


@pytest.mark.anyio
async def test_golden_bias_is_positive_when_forecast_runs_above_actual(
    accuracy: AccuracyService,
) -> None:
    report = await accuracy.report(GOLDEN_DAY, 7, None)

    assert round(report.kpis.bias_mw) == 1863
    signed = [h.forecast_mw - h.actual_mw for h in report.hours]
    assert [h.error_mw for h in report.hours] == signed
    assert report.kpis.bias_mw == pytest.approx(sum(signed) / len(signed))


@pytest.mark.anyio
async def test_hour_filter_uses_only_that_uk_delivery_hour(accuracy: AccuracyService) -> None:
    all_hours = await accuracy.report(GOLDEN_DAY, 7, None)
    expected = [h for h in all_hours.hours if h.start_time.astimezone(UK).hour == 18]

    report = await accuracy.report(GOLDEN_DAY, 7, 18)

    assert report.hours == expected
    assert len(report.hours) == 7
    assert report.period.days == 7
    errors = [h.error_mw for h in expected]
    assert report.kpis.typical_error_mw == pytest.approx(sum(map(abs, errors)) / 7)
    assert report.kpis.bias_mw == pytest.approx(sum(errors) / 7)


@pytest.mark.anyio
async def test_previous_window_reports_its_real_day_count(accuracy: AccuracyService) -> None:
    # Window 2..8 Jan. Previous window 26 Dec..1 Jan, but the fixture actuals start on
    # 1 Jan, so only one day of the previous window has data.
    report = await accuracy.report(date(2026, 1, 10), 7, None)
    # Delivery 3 Jan has the window 26 Dec..1 Jan, so its kpis are the previous window's.
    previous = await accuracy.report(date(2026, 1, 3), 7, None)

    assert report.period.from_ == date(2026, 1, 2)
    assert report.previous_period is not None
    assert report.previous_period.from_ == date(2025, 12, 26)
    assert report.previous_period.to == date(2026, 1, 1)
    assert report.previous_period.days == 1
    assert previous.period.days == 1
    assert report.kpis.previous_typical_error_mw == pytest.approx(previous.kpis.typical_error_mw)
    assert report.kpis.trend_mw == pytest.approx(
        report.kpis.typical_error_mw - previous.kpis.typical_error_mw
    )


@pytest.mark.anyio
async def test_trend_is_null_when_the_previous_window_has_no_data(
    accuracy: AccuracyService,
) -> None:
    # Window 1..7 Jan. Previous window 25..31 Dec has no fixture actuals.
    report = await accuracy.report(date(2026, 1, 9), 7, None)

    assert report.period.days == 7
    assert report.previous_period is None
    assert report.kpis.previous_typical_error_mw is None
    assert report.kpis.trend_mw is None


def _expected_lead_buckets(hours: list[HourError]) -> dict[int, list[float]]:
    """Every fixture forecast version for the given hours, bucketed by 6-hour lead time."""
    actual = {h.start_time: h.actual_mw for h in hours}
    buckets: dict[int, list[float]] = {}
    for row in fixture_forecasts():
        if row.start_time not in actual or row.publish_time > row.start_time:
            continue
        lead = (row.start_time - row.publish_time).total_seconds() / 3600
        if lead < 48:
            buckets.setdefault(int(lead // 6) * 6, []).append(
                row.generation - actual[row.start_time]
            )
    return buckets


@pytest.mark.anyio
@pytest.mark.parametrize("hour", [None, 18])
async def test_lead_time_buckets_use_every_version_before_the_hour(
    accuracy: AccuracyService, hour: int | None
) -> None:
    report = await accuracy.report(GOLDEN_DAY, 7, hour)
    expected = _expected_lead_buckets(report.hours)

    assert [b.from_hours for b in report.lead_time] == sorted(expected)
    assert len(report.lead_time) == 8
    for bucket in report.lead_time:
        errors = expected[bucket.from_hours]
        assert bucket.to_hours == bucket.from_hours + 6
        assert bucket.count == len(errors)
        assert bucket.typical_error_mw == pytest.approx(sum(map(abs, errors)) / len(errors))
