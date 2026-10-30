from datetime import date, datetime
from typing import Protocol

from app.models.domain import RawActual, RawForecast


class ElexonError(Exception):
    """Elexon failed, timed out, or returned data the client cannot read."""


class ElexonClient(Protocol):
    async def wind_actuals(self, start: date, end: date) -> list[RawActual]:
        """FUELHH wind rows for settlement dates start..end, both inclusive."""
        ...

    async def wind_forecasts(
        self, published_from: datetime, published_to: datetime
    ) -> list[RawForecast]:
        """WINDFOR rows with publishTime in published_from..published_to, both inclusive."""
        ...
