"""Composition root: the only module that names implementation classes.

Tests replace get_elexon_client through app.dependency_overrides.
"""

from typing import Annotated

from fastapi import Depends

from app.integrations.elexon.client import DefaultElexonClient
from app.integrations.elexon.contract import ElexonClient
from app.services.accuracy.contract import AccuracyService
from app.services.accuracy.service import DefaultAccuracyService
from app.services.delivery_day.contract import DeliveryDayService
from app.services.delivery_day.service import DefaultDeliveryDayService
from app.services.forecast_selection.contract import ForecastSelectionService
from app.services.forecast_selection.service import DefaultForecastSelectionService
from app.services.wind_data.contract import WindDataService
from app.services.wind_data.service import DefaultWindDataService

_elexon = DefaultElexonClient()
_selection = DefaultForecastSelectionService()


def get_elexon_client() -> ElexonClient:
    return _elexon


def get_forecast_selection() -> ForecastSelectionService:
    return _selection


# One wind data service per Elexon client, so its in-process cache outlives a request.
# Each entry keeps its client alive, so the id key cannot be reused by another client.
_wind_data: dict[int, tuple[ElexonClient, WindDataService]] = {}


def get_wind_data_service(
    elexon: Annotated[ElexonClient, Depends(get_elexon_client)],
) -> WindDataService:
    if id(elexon) not in _wind_data:
        _wind_data[id(elexon)] = (elexon, DefaultWindDataService(elexon))
    return _wind_data[id(elexon)][1]


def get_delivery_day_service(
    wind_data: Annotated[WindDataService, Depends(get_wind_data_service)],
    selection: Annotated[ForecastSelectionService, Depends(get_forecast_selection)],
) -> DeliveryDayService:
    return DefaultDeliveryDayService(wind_data, selection)


def get_accuracy_service(
    wind_data: Annotated[WindDataService, Depends(get_wind_data_service)],
    selection: Annotated[ForecastSelectionService, Depends(get_forecast_selection)],
) -> AccuracyService:
    return DefaultAccuracyService(wind_data, selection)
