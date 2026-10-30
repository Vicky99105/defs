from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.auth import require_user
from app.api.cache import set_private_cache
from app.api.deps import get_delivery_day_service
from app.integrations.elexon.contract import ElexonError
from app.models.api import DeliveryDayResponse, ErrorResponse
from app.services.delivery_day.contract import (
    DeliveryDateOutOfRange,
    DeliveryDayService,
    NoForecastAvailable,
)

router = APIRouter()


@router.get(
    "/api/delivery-day",
    response_model=DeliveryDayResponse,
    dependencies=[Depends(require_user)],
    responses={
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def delivery_day(
    response: Response,
    service: Annotated[DeliveryDayService, Depends(get_delivery_day_service)],
    day: Annotated[date, Query(alias="date")],
) -> DeliveryDayResponse:
    try:
        result = await service.delivery_day(day)
    except DeliveryDateOutOfRange as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ElexonError as exc:
        raise HTTPException(status_code=502, detail=f"Elexon is unavailable: {exc}") from exc
    except NoForecastAvailable as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    set_private_cache(response)
    return result
