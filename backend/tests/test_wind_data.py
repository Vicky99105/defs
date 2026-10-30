from datetime import UTC, datetime

import pytest

from app.services.wind_data.contract import WindDataService
from app.services.wind_data.service import DefaultWindDataService
from tests.fakes.elexon import FakeElexonClient

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
