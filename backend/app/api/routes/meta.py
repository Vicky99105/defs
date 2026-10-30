from fastapi import APIRouter, Response

from app.api.cache import set_public_cache
from app.models.api import MetaResponse
from app.services.delivery_day.contract import MAX_DELIVERY_DATE, MIN_DELIVERY_DATE

router = APIRouter()


@router.get("/api/meta", response_model=MetaResponse)
def meta(response: Response) -> MetaResponse:
    set_public_cache(response)
    return MetaResponse(
        min_delivery_date=MIN_DELIVERY_DATE,
        max_delivery_date=MAX_DELIVERY_DATE,
        decision_time_local="11:00",
        time_zone="Europe/London",
        windows_days=[7, 14, 30],
    )
