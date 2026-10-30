from datetime import date, datetime, timedelta

from app.integrations.elexon.contract import ElexonClient
from app.models.domain import ForecastVersion

# WINDFOR looks at most about 66.5 hours ahead (measured on the January data).
# Fetching publishes from 72 hours before the first target hour covers every version.
WINDFOR_MAX_LEAD = timedelta(hours=72)


class DefaultWindDataService:
    def __init__(self, elexon: ElexonClient) -> None:
        self._elexon = elexon

    async def hourly_actuals(self, start: date, end: date) -> dict[datetime, float]:
        # Phase 2: FUELHH dedupe and half-hour to hour aggregation.
        raise NotImplementedError("hourly_actuals lands in Phase 2")

    async def forecast_versions(
        self, targets_from: datetime, targets_to: datetime, published_to: datetime
    ) -> list[ForecastVersion]:
        rows = await self._elexon.wind_forecasts(targets_from - WINDFOR_MAX_LEAD, published_to)
        return [
            ForecastVersion(publish_time=r.publish_time, start_time=r.start_time, mw=r.generation)
            for r in rows
            if targets_from <= r.start_time < targets_to
            and r.publish_time <= published_to
            and r.publish_time <= r.start_time
        ]
