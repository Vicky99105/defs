import asyncio
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta

from app.integrations.elexon.contract import ElexonClient
from app.models.domain import ForecastVersion, RawActual, RawForecast

# WINDFOR looks at most about 66.5 hours ahead (measured on the January data).
# Fetching publishes from 72 hours before the first target hour covers every version.
WINDFOR_MAX_LEAD = timedelta(hours=72)

# Fetches go in 7-day chunks aligned to a fixed epoch, so overlapping requests share
# chunks. Past Elexon data does not change, so a chunk that ended before now never expires.
CHUNK = timedelta(days=7)
EPOCH = date(2025, 1, 6)
EPOCH_UTC = datetime.combine(EPOCH, time(0), UTC)


def _date_chunks(start: date, end: date) -> list[date]:
    first = EPOCH + CHUNK * ((start - EPOCH) // CHUNK)
    return [first + CHUNK * i for i in range((end - first) // CHUNK + 1)]


def _time_chunks(start: datetime, end: datetime) -> list[datetime]:
    first = EPOCH_UTC + CHUNK * ((start - EPOCH_UTC) // CHUNK)
    return [first + CHUNK * i for i in range((end - first) // CHUNK + 1)]


class DefaultWindDataService:
    def __init__(self, elexon: ElexonClient) -> None:
        self._elexon = elexon
        self._actual_chunks: dict[date, list[RawActual]] = {}
        self._forecast_chunks: dict[datetime, list[RawForecast]] = {}

    async def hourly_actuals(self, start: date, end: date) -> dict[datetime, float]:
        rows = [r for r in await self._actuals(start, end) if start <= r.settlement_date <= end]
        # FUELHH can republish a half-hour. Keep the row with the latest publishTime.
        latest: dict[datetime, RawActual] = {}
        for row in rows:
            current = latest.get(row.start_time)
            if current is None or row.publish_time > current.publish_time:
                latest[row.start_time] = row
        halves: dict[datetime, list[float]] = defaultdict(list)
        for row in latest.values():
            hour = row.start_time.replace(minute=0, second=0, microsecond=0)
            halves[hour].append(row.generation)
        return {hour: sum(values) / 2 for hour, values in halves.items() if len(values) == 2}

    async def forecast_versions(
        self, targets_from: datetime, targets_to: datetime, published_to: datetime
    ) -> list[ForecastVersion]:
        rows = await self._forecasts(targets_from - WINDFOR_MAX_LEAD, published_to)
        return [
            ForecastVersion(publish_time=r.publish_time, start_time=r.start_time, mw=r.generation)
            for r in rows
            if targets_from <= r.start_time < targets_to
            and r.publish_time <= published_to
            and r.publish_time <= r.start_time
        ]

    async def _actuals(self, start: date, end: date) -> list[RawActual]:
        chunks = _date_chunks(start, end)
        missing = [c for c in chunks if c not in self._actual_chunks]
        fetched = await asyncio.gather(
            *(self._elexon.wind_actuals(c, c + CHUNK - timedelta(days=1)) for c in missing)
        )
        today = datetime.now(UTC).date()
        result = {c: self._actual_chunks[c] for c in chunks if c in self._actual_chunks}
        for chunk, rows in zip(missing, fetched, strict=True):
            result[chunk] = rows
            # A settlement date is final once it is over; allow one more day for late rows.
            if chunk + CHUNK + timedelta(days=1) <= today:
                self._actual_chunks[chunk] = rows
        return [row for c in chunks for row in result[c]]

    async def _forecasts(
        self, published_from: datetime, published_to: datetime
    ) -> list[RawForecast]:
        chunks = _time_chunks(published_from, published_to)
        missing = [c for c in chunks if c not in self._forecast_chunks]
        # Elexon bounds are inclusive, so drop rows on the end edge: they belong to the next chunk.
        fetched = await asyncio.gather(
            *(self._elexon.wind_forecasts(c, c + CHUNK) for c in missing)
        )
        now = datetime.now(UTC)
        result = {c: self._forecast_chunks[c] for c in chunks if c in self._forecast_chunks}
        for chunk, rows in zip(missing, fetched, strict=True):
            in_chunk = [r for r in rows if r.publish_time < chunk + CHUNK]
            result[chunk] = in_chunk
            if chunk + CHUNK <= now:
                self._forecast_chunks[chunk] = in_chunk
        return [row for c in chunks for row in result[c]]
