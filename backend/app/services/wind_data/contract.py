from datetime import date, datetime
from typing import Protocol

from app.models.domain import ForecastVersion


class WindDataService(Protocol):
    async def hourly_actuals(self, start: date, end: date) -> dict[datetime, float]:
        """Hourly mean actual MW keyed by hour start (UTC), for dates start..end."""
        ...

    async def forecast_versions(
        self, targets_from: datetime, targets_to: datetime, published_to: datetime
    ) -> list[ForecastVersion]:
        """Every forecast for target hours in [targets_from, targets_to), published at or
        before published_to and at or before its own target hour."""
        ...
