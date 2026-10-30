from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.auth import require_user
from app.api.cache import set_private_cache
from app.api.deps import get_accuracy_service
from app.integrations.elexon.contract import ElexonError
from app.models.api import AccuracyResponse, ErrorResponse
from app.services.accuracy.contract import AccuracyService, InvalidAccuracyQuery, NoAccuracyData
from app.services.delivery_day.contract import DeliveryDateOutOfRange

router = APIRouter()


@router.get(
    "/api/accuracy",
    response_model=AccuracyResponse,
    dependencies=[Depends(require_user)],
    responses={
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
    },
)
async def accuracy(
    response: Response,
    service: Annotated[AccuracyService, Depends(get_accuracy_service)],
    day: Annotated[date, Query(alias="date")],
    window: int,
    hour: int | None = None,
) -> AccuracyResponse:
    try:
        result = await service.report(day, window, hour)
    except (DeliveryDateOutOfRange, InvalidAccuracyQuery) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ElexonError as exc:
        raise HTTPException(status_code=502, detail=f"Elexon is unavailable: {exc}") from exc
    except NoAccuracyData as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    set_private_cache(response)
    return result
