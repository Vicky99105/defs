from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.models.domain import ForecastVersion

UK = ZoneInfo("Europe/London")
DECISION_LOCAL_TIME = time(11, 0)


class DefaultForecastSelectionService:
    def decision_time(self, delivery_date: date) -> datetime:
        return datetime.combine(delivery_date - timedelta(days=1), DECISION_LOCAL_TIME, UK)

    def decision_forecast(
        self, versions: list[ForecastVersion], cutoff: datetime
    ) -> dict[datetime, ForecastVersion]:
        chosen: dict[datetime, ForecastVersion] = {}
        for version in versions:
            if version.publish_time > cutoff:
                continue
            current = chosen.get(version.start_time)
            if current is None or version.publish_time > current.publish_time:
                chosen[version.start_time] = version
        return chosen
