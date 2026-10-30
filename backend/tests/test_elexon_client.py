"""DefaultElexonClient against an in-memory Elexon (httpx.MockTransport serving the fixtures)."""

import json
from datetime import UTC, date, datetime

import httpx
import pytest

from app.integrations.elexon.client import DefaultElexonClient
from app.integrations.elexon.contract import ElexonClient, ElexonError
from tests.fakes.elexon import ACTUALS_FILE, FORECASTS_FILE


class FixtureElexon:
    """Answers the two stream endpoints from the fixture files, honouring inclusive bounds."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self._actuals = json.loads(ACTUALS_FILE.read_text())
        self._forecasts = json.loads(FORECASTS_FILE.read_text())

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        q = request.url.params
        if request.url.path.endswith("/FUELHH/stream"):
            lo, hi = q["settlementDateFrom"], q["settlementDateTo"]
            rows = [r for r in self._actuals if lo <= r["settlementDate"] <= hi]
        else:
            lo_t = datetime.fromisoformat(q["publishDateTimeFrom"].replace("Z", "+00:00"))
            hi_t = datetime.fromisoformat(q["publishDateTimeTo"].replace("Z", "+00:00"))
            rows = [
                r
                for r in self._forecasts
                if lo_t <= datetime.fromisoformat(r["publishTime"].replace("Z", "+00:00")) <= hi_t
            ]
        return httpx.Response(200, json=rows)


def client_for(handler: object) -> ElexonClient:
    return DefaultElexonClient(transport=httpx.MockTransport(handler))  # type: ignore[arg-type]


@pytest.mark.anyio
async def test_wind_forecasts_splits_long_ranges_into_7_day_chunks_without_duplicates() -> None:
    elexon = FixtureElexon()
    # 21 days. Every chunk edge (8 Jan and 15 Jan 02:30) is a real publish time, so the
    # inclusive bounds return that publish twice and the client must dedupe it.
    start = datetime(2026, 1, 1, 2, 30, tzinfo=UTC)
    end = datetime(2026, 1, 22, 2, 30, tzinfo=UTC)

    rows = await client_for(elexon).wind_forecasts(start, end)

    assert len(elexon.requests) == 3
    keys = [(r.publish_time, r.start_time) for r in rows]
    assert len(keys) == len(set(keys))
    expected = [
        r
        for r in json.loads(FORECASTS_FILE.read_text())
        if start <= datetime.fromisoformat(r["publishTime"].replace("Z", "+00:00")) <= end
    ]
    assert len(rows) == len(expected)


@pytest.mark.anyio
async def test_wind_actuals_splits_dates_into_7_day_chunks() -> None:
    elexon = FixtureElexon()

    rows = await client_for(elexon).wind_actuals(date(2026, 1, 1), date(2026, 1, 15))

    assert len(elexon.requests) == 3
    assert len(rows) == 15 * 48
    assert all(r.generation >= 0 for r in rows)


@pytest.mark.anyio
async def test_http_error_raises_elexon_error() -> None:
    client = client_for(lambda request: httpx.Response(503, text="maintenance"))

    with pytest.raises(ElexonError, match="503"):
        await client.wind_forecasts(
            datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 1, 2, tzinfo=UTC)
        )


@pytest.mark.anyio
async def test_timeout_raises_elexon_error() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(ElexonError, match="timed out"):
        await client_for(timeout).wind_actuals(date(2026, 1, 1), date(2026, 1, 2))
