"""Domain types shared by the integration and service layers.

All datetimes are timezone-aware.
"""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True, slots=True)
class RawActual:
    """One FUELHH row for wind: average MW over a 30-minute settlement period."""

    publish_time: datetime
    start_time: datetime
    settlement_date: date
    settlement_period: int
    generation: float


@dataclass(frozen=True, slots=True)
class RawForecast:
    """One WINDFOR row: the forecast MW for one target hour, from one publish."""

    publish_time: datetime
    start_time: datetime
    generation: float


@dataclass(frozen=True, slots=True)
class ForecastVersion:
    """One forecast value for one target hour, as published at publish_time."""

    publish_time: datetime
    start_time: datetime
    mw: float
