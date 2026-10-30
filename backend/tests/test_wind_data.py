from datetime import UTC, date, datetime, timedelta

import pytest

from app.models.domain import RawActual
from app.services.wind_data.contract import WindDataService
from app.services.wind_data.service import DefaultWindDataService
from tests.fakes.elexon import FakeElexonClient, fixture_actuals

DAY_START = datetime(2026, 1, 15, 0, 0, tzinfo=UTC)
DAY_END = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
CUTOFF = datetime(2026, 1, 14, 11, 0, tzinfo=UTC)


@pytest.fixture
def wind_data() -> WindDataService:
    return DefaultWindDataService(FakeElexonClient())


@pytest.mark.anyio
async def test_forecast_versions_cover_every_pre_cutoff_publish_for_the_day(
    wind_data: WindDataService,
) -> None:
    versions = await wind_data.forecast_versions(DAY_START, DAY_END, CUTOFF)

    publishes = sorted({v.publish_time for v in versions})
    assert publishes[0] == datetime(2026, 1, 13, 2, 30, tzinfo=UTC)
    assert publishes[-1] == datetime(2026, 1, 14, 9, 30, tzinfo=UTC)
    assert len(publishes) == 12
    assert all(DAY_START <= v.start_time < DAY_END for v in versions)
    assert all(v.publish_time <= CUTOFF for v in versions)


@pytest.mark.anyio
async def test_forecast_versions_drop_rows_published_after_their_target_hour(
    wind_data: WindDataService,
) -> None:
    # With published_to at the end of the day, same-day publishes include rows for hours
    # that had already started. Those are not forecasts and must be dropped.
    versions = await wind_data.forecast_versions(DAY_START, DAY_END, DAY_END)

    assert any(v.publish_time > DAY_START for v in versions)
    assert all(v.publish_time <= v.start_time for v in versions)


@pytest.mark.anyio
async def test_hourly_actuals_average_the_two_half_hours(wind_data: WindDataService) -> None:
    halves = {
        r.start_time: r.generation
        for r in fixture_actuals()
        if r.settlement_date == date(2026, 1, 15)
    }

    hourly = await wind_data.hourly_actuals(date(2026, 1, 15), date(2026, 1, 15))

    assert len(hourly) == 24
    assert min(hourly) == DAY_START
    assert max(hourly) == datetime(2026, 1, 15, 23, 0, tzinfo=UTC)
    assert hourly[DAY_START] == (halves[DAY_START] + halves[DAY_START + timedelta(minutes=30)]) / 2


def _half(start: datetime, mw: float, published: datetime) -> RawActual:
    return RawActual(
        publish_time=published,
        start_time=start,
        settlement_date=start.date(),
        settlement_period=start.hour * 2 + start.minute // 30 + 1,
        generation=mw,
    )


@pytest.mark.anyio
async def test_hourly_actuals_keep_the_latest_publish_of_a_repeated_half_hour() -> None:
    first = datetime(2026, 1, 15, 1, 0, tzinfo=UTC)
    rows = [
        _half(DAY_START, 100, published=DAY_START + timedelta(hours=1)),
        _half(DAY_START, 900, published=DAY_START + timedelta(hours=3)),
        _half(DAY_START, 500, published=DAY_START + timedelta(hours=2)),
        _half(DAY_START + timedelta(minutes=30), 300, published=first),
        # 01:00 has only one half, so the hour is skipped.
        _half(first, 700, published=first + timedelta(hours=1)),
    ]
    wind_data = DefaultWindDataService(FakeElexonClient(actuals=rows))

    hourly = await wind_data.hourly_actuals(date(2026, 1, 15), date(2026, 1, 15))

    assert hourly == {DAY_START: (900 + 300) / 2}


@pytest.mark.anyio
async def test_repeated_and_contained_ranges_are_served_from_the_cache() -> None:
    elexon = FakeElexonClient()
    wind_data = DefaultWindDataService(elexon)
    first_actuals = await wind_data.hourly_actuals(date(2026, 1, 1), date(2026, 1, 31))
    first_versions = await wind_data.forecast_versions(DAY_START, DAY_END, CUTOFF)
    calls = elexon.calls

    again_actuals = await wind_data.hourly_actuals(date(2026, 1, 1), date(2026, 1, 31))
    contained = await wind_data.hourly_actuals(date(2026, 1, 10), date(2026, 1, 12))
    again_versions = await wind_data.forecast_versions(DAY_START, DAY_END, CUTOFF)

    assert elexon.calls == calls
    assert again_actuals == first_actuals
    assert again_versions == first_versions
    assert contained == {h: v for h, v in first_actuals.items() if 10 <= h.day <= 12}
