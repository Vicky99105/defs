"""FakeElexonClient: serves raw Elexon rows from the January fixtures in data/."""

import json
from datetime import date, datetime
from functools import cache
from pathlib import Path

from app.integrations.elexon.contract import ElexonError
from app.models.domain import RawActual, RawForecast

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
ACTUALS_FILE = DATA_DIR / "actuals" / "fuelhh_wind_2026-01-01_2026-02-01.json"
FORECASTS_FILE = DATA_DIR / "forecasts" / "windfor_published_2025-12-30_2026-02-02.json"


def _ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@cache
def fixture_actuals() -> tuple[RawActual, ...]:
    rows = json.loads(ACTUALS_FILE.read_text())
    return tuple(
        RawActual(
            publish_time=_ts(r["publishTime"]),
            start_time=_ts(r["startTime"]),
            settlement_date=date.fromisoformat(r["settlementDate"]),
            settlement_period=int(r["settlementPeriod"]),
            generation=float(r["generation"]),
        )
        for r in rows
    )


@cache
def fixture_forecasts() -> tuple[RawForecast, ...]:
    rows = json.loads(FORECASTS_FILE.read_text())
    return tuple(
        RawForecast(
            publish_time=_ts(r["publishTime"]),
            start_time=_ts(r["startTime"]),
            generation=float(r["generation"]),
        )
        for r in rows
    )


class FakeElexonClient:
    """Implements the ElexonClient contract. Set fail=True to simulate an Elexon outage."""

    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    async def wind_actuals(self, start: date, end: date) -> list[RawActual]:
        if self.fail:
            raise ElexonError("Fake Elexon outage")
        return [r for r in fixture_actuals() if start <= r.settlement_date <= end]

    async def wind_forecasts(
        self, published_from: datetime, published_to: datetime
    ) -> list[RawForecast]:
        if self.fail:
            raise ElexonError("Fake Elexon outage")
        return [r for r in fixture_forecasts() if published_from <= r.publish_time <= published_to]
