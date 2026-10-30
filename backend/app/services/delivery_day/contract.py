from datetime import date
from typing import Protocol

from app.models.api import DeliveryDayResponse

# Decisions made in January 2026: the first decision (1 Jan) delivers on 2 Jan,
# the last (31 Jan) delivers on 1 Feb.
MIN_DELIVERY_DATE = date(2026, 1, 2)
MAX_DELIVERY_DATE = date(2026, 2, 1)


class DeliveryDateOutOfRange(ValueError):
    """The delivery date is outside MIN_DELIVERY_DATE..MAX_DELIVERY_DATE."""


class NoForecastAvailable(Exception):
    """Elexon has no forecast for the day published before the decision time."""


class DeliveryDayService(Protocol):
    async def delivery_day(self, delivery_date: date) -> DeliveryDayResponse:
        """The decision-time forecast for one delivery day, with the earlier versions."""
        ...
