from datetime import date, datetime
from typing import Protocol

from app.models.domain import ForecastVersion


class ForecastSelectionService(Protocol):
    def decision_time(self, delivery_date: date) -> datetime:
        """11:00 Europe/London on the day before delivery_date."""
        ...

    def decision_forecast(
        self, versions: list[ForecastVersion], cutoff: datetime
    ) -> dict[datetime, ForecastVersion]:
        """Per target hour, the latest version with publish_time at or before cutoff.
        Hours with no eligible version are absent from the result."""
        ...
