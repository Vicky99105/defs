"""HTTP response models. These mirror the HTTP contract in the build plan, section 4.3."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict
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


class ErrorResponse(ApiModel):
    detail: str
