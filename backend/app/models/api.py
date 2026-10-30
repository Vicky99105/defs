"""HTTP response models. These mirror the HTTP contract in the build plan, section 4.3."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)


class MetaResponse(ApiModel):
    min_delivery_date: date
    max_delivery_date: date
    decision_time_local: str
    time_zone: str
    windows_days: list[int]


class Point(ApiModel):
    start_time: datetime
    mw: float


class ForecastSeries(ApiModel):
    publish_time: datetime
    points: list[Point]


class DeliveryDaySummary(ApiModel):
    peak: Point
    low: Point
    biggest_revision: Point


class DeliveryDayResponse(ApiModel):
    delivery_date: date
    decision_time: datetime
    latest: ForecastSeries
    earlier: list[ForecastSeries]
    summary: DeliveryDaySummary


class Period(ApiModel):
    """UK delivery dates from..to, both inclusive. days counts the days that have data."""

    from_: date = Field(alias="from")
    to: date
    days: int


class AccuracyKpis(ApiModel):
    typical_error_mw: float
    bias_mw: float
    trend_mw: float | None
    previous_typical_error_mw: float | None


class HourError(ApiModel):
    start_time: datetime
    forecast_mw: float
    actual_mw: float
    error_mw: float


class LeadTimeBucket(ApiModel):
    from_hours: int
    to_hours: int
    typical_error_mw: float
    count: int


class AccuracyResponse(ApiModel):
    period: Period
    previous_period: Period | None
    kpis: AccuracyKpis
    hours: list[HourError]
    lead_time: list[LeadTimeBucket]


class ErrorResponse(ApiModel):
    detail: str


class LoginRequest(ApiModel):
    username: str
    password: str


class LoginResponse(ApiModel):
    token: str
    expires_at: datetime
