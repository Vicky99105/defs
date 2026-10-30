import asyncio
from datetime import UTC, date, datetime, timedelta
from typing import Any

import httpx

from app.integrations.elexon.contract import ElexonError
from app.models.domain import RawActual, RawForecast

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
CHUNK = timedelta(days=7)
DEFAULT_TIMEOUT = httpx.Timeout(20.0, connect=5.0)


def _iso_utc(value: datetime) -> str:
    return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class DefaultElexonClient:
    """Reads Elexon BMRS stream endpoints. Both endpoints treat their bounds as inclusive."""

    def __init__(
        self,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: httpx.Timeout = DEFAULT_TIMEOUT,
    ) -> None:
        self._transport = transport
        self._timeout = timeout

    async def wind_actuals(self, start: date, end: date) -> list[RawActual]:
        chunks: list[dict[str, str]] = []
        cursor = start
        while cursor <= end:
            chunk_end = min(cursor + CHUNK - timedelta(days=1), end)
            chunks.append(
                {
                    "settlementDateFrom": cursor.isoformat(),
                    "settlementDateTo": chunk_end.isoformat(),
                    "fuelType": "WIND",
                }
            )
            cursor = chunk_end + timedelta(days=1)
        rows = await self._fetch_all("FUELHH", chunks)
        try:
            parsed = {
                (r["publishTime"], r["startTime"]): RawActual(
                    publish_time=_parse_ts(r["publishTime"]),
                    start_time=_parse_ts(r["startTime"]),
                    settlement_date=date.fromisoformat(r["settlementDate"]),
                    settlement_period=int(r["settlementPeriod"]),
                    generation=float(r["generation"]),
                )
                for r in rows
                if r.get("fuelType") == "WIND"
            }
        except (KeyError, TypeError, ValueError) as exc:
            raise ElexonError(f"Elexon FUELHH returned an unreadable row: {exc}") from exc
        return list(parsed.values())

    async def wind_forecasts(
        self, published_from: datetime, published_to: datetime
    ) -> list[RawForecast]:
        chunks: list[dict[str, str]] = []
        cursor = published_from
        while cursor <= published_to:
            chunk_end = min(cursor + CHUNK, published_to)
            chunks.append(
                {"publishDateTimeFrom": _iso_utc(cursor), "publishDateTimeTo": _iso_utc(chunk_end)}
            )
            if chunk_end == published_to:
                break
            cursor = chunk_end
        rows = await self._fetch_all("WINDFOR", chunks)
        try:
            # Chunk edges are inclusive on both sides, so a publish on an edge arrives twice.
            parsed = {
                (r["publishTime"], r["startTime"]): RawForecast(
                    publish_time=_parse_ts(r["publishTime"]),
                    start_time=_parse_ts(r["startTime"]),
                    generation=float(r["generation"]),
                )
                for r in rows
            }
        except (KeyError, TypeError, ValueError) as exc:
            raise ElexonError(f"Elexon WINDFOR returned an unreadable row: {exc}") from exc
        return list(parsed.values())

    async def _fetch_all(self, dataset: str, chunks: list[dict[str, str]]) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(
            base_url=BASE_URL, timeout=self._timeout, transport=self._transport
        ) as http:
            pages = await asyncio.gather(*(self._fetch(http, dataset, p) for p in chunks))
        return [row for page in pages for row in page]

    async def _fetch(
        self, http: httpx.AsyncClient, dataset: str, params: dict[str, str]
    ) -> list[dict[str, Any]]:
        try:
            response = await http.get(f"/{dataset}/stream", params=params)
        except httpx.TimeoutException as exc:
            raise ElexonError(f"Elexon {dataset} request timed out") from exc
        except httpx.HTTPError as exc:
            raise ElexonError(f"Elexon {dataset} request failed: {exc}") from exc
        if response.status_code != 200:
            raise ElexonError(f"Elexon {dataset} returned HTTP {response.status_code}")
        try:
            body = response.json()
        except ValueError as exc:
            raise ElexonError(f"Elexon {dataset} returned invalid JSON") from exc
        if not isinstance(body, list):
            raise ElexonError(f"Elexon {dataset} returned an unexpected payload")
        return body
