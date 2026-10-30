from datetime import date
from typing import Protocol

from app.models.api import AccuracyResponse

WINDOW_DAYS = (7, 14, 30)


class InvalidAccuracyQuery(ValueError):
    """The window is not one of WINDOW_DAYS, or the hour is outside 0..23."""


class NoAccuracyData(Exception):
    """Elexon has no matched forecast and actual for any hour in the window."""


class AccuracyService(Protocol):
    async def report(
        self, delivery_date: date, window_days: int, hour: int | None
    ) -> AccuracyResponse:
        """Decision-forecast error over the window_days UK days ending on delivery_date - 2.
        If hour is set (0..23, UK time), every number uses only that delivery hour.
        Raises DeliveryDateOutOfRange, InvalidAccuracyQuery, NoAccuracyData or ElexonError."""
        ...
