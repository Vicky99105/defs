from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_elexon_client
from app.main import app
from tests.fakes.elexon import FakeElexonClient

CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800"


def _client_with(fake: FakeElexonClient) -> Iterator[TestClient]:
    app.dependency_overrides[get_elexon_client] = lambda: fake
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def client() -> Iterator[TestClient]:
    yield from _client_with(FakeElexonClient())


@pytest.fixture
def failing_client() -> Iterator[TestClient]:
    yield from _client_with(FakeElexonClient(fail=True))


def test_meta(client: TestClient) -> None:
    response = client.get("/api/meta")

    assert response.status_code == 200
    assert response.json() == {
        "minDeliveryDate": "2026-01-02",
        "maxDeliveryDate": "2026-02-01",
        "decisionTimeLocal": "11:00",
        "timeZone": "Europe/London",
        "windowsDays": [7, 14, 30],
    }
    assert response.headers["cache-control"] == CACHE_CONTROL


def test_delivery_day_15_jan(client: TestClient) -> None:
    response = client.get("/api/delivery-day", params={"date": "2026-01-15"})

    assert response.status_code == 200
    assert response.headers["cache-control"] == CACHE_CONTROL
    body = response.json()
    assert body["deliveryDate"] == "2026-01-15"
    assert body["decisionTime"] == "2026-01-14T11:00:00Z"
    latest = body["latest"]
    assert latest["publishTime"] == "2026-01-14T09:30:00Z"
    assert len(latest["points"]) == 24
    assert latest["points"][0] == {"startTime": "2026-01-15T00:00:00Z", "mw": 15828}
    assert body["summary"]["peak"] == {"startTime": "2026-01-15T00:00:00Z", "mw": 15828}


def test_delivery_day_earlier_versions_are_pre_cutoff_and_exclude_latest(
    client: TestClient,
) -> None:
    body = client.get("/api/delivery-day", params={"date": "2026-01-15"}).json()

    publishes = [v["publishTime"] for v in body["earlier"]]
    assert publishes == sorted(publishes)
    assert len(publishes) == 11
    assert publishes[0] == "2026-01-13T02:30:00Z"
    assert publishes[-1] == "2026-01-14T07:30:00Z"


def test_delivery_day_summary_low_and_biggest_revision(client: TestClient) -> None:
    body = client.get("/api/delivery-day", params={"date": "2026-01-15"}).json()

    points = body["latest"]["points"]
    low = min(points, key=lambda p: p["mw"])
    assert body["summary"]["low"] == low
    # First pre-cutoff version per hour. The oldest publish does not reach every hour
    # (13 Jan 02:30 stops at 15 Jan 21:00), so take the first publish that covers each one.
    first: dict[str, float] = {}
    for version in body["earlier"]:
        for p in version["points"]:
            first.setdefault(p["startTime"], p["mw"])
    revisions = {p["startTime"]: p["mw"] - first[p["startTime"]] for p in points}
    biggest = max(revisions.items(), key=lambda kv: abs(kv[1]))
    assert body["summary"]["biggestRevision"] == {"startTime": biggest[0], "mw": biggest[1]}


@pytest.mark.parametrize("value", ["2026-03-01", "2026-01-01", "2026-02-02"])
def test_delivery_day_outside_january_range_is_422(client: TestClient, value: str) -> None:
    response = client.get("/api/delivery-day", params={"date": value})

    assert response.status_code == 422
    assert "2026-01-02" in response.json()["detail"]
    assert "cache-control" not in response.headers


def test_delivery_day_elexon_failure_is_502(failing_client: TestClient) -> None:
    response = failing_client.get("/api/delivery-day", params={"date": "2026-01-15"})

    assert response.status_code == 502
    assert "Elexon" in response.json()["detail"]
    assert "cache-control" not in response.headers


def test_accuracy_golden_15_jan_7_days(client: TestClient) -> None:
    response = client.get("/api/accuracy", params={"date": "2026-01-15", "window": 7})

    assert response.status_code == 200
    assert response.headers["cache-control"] == CACHE_CONTROL
    body = response.json()
    assert body["period"] == {"from": "2026-01-07", "to": "2026-01-13", "days": 7}
    assert body["previousPeriod"] == {"from": "2025-12-31", "to": "2026-01-06", "days": 6}
    assert round(body["kpis"]["typicalErrorMw"]) == 2354
    assert round(body["kpis"]["biasMw"]) == 1863
    assert set(body["kpis"]) == {"typicalErrorMw", "biasMw", "trendMw", "previousTypicalErrorMw"}
    assert len(body["hours"]) == 168
    assert set(body["hours"][0]) == {"startTime", "forecastMw", "actualMw", "errorMw"}
    assert body["hours"][0]["startTime"] == "2026-01-07T00:00:00Z"
    assert set(body["leadTime"][0]) == {"fromHours", "toHours", "typicalErrorMw", "count"}


def test_accuracy_hour_filter(client: TestClient) -> None:
    body = client.get(
        "/api/accuracy", params={"date": "2026-01-15", "window": 7, "hour": 18}
    ).json()

    assert [h["startTime"][11:] for h in body["hours"]] == ["18:00:00Z"] * 7


@pytest.mark.parametrize(
    ("params", "message"),
    [
        ({"date": "2026-02-02", "window": 7}, "2026-01-02"),
        ({"date": "2026-01-15", "window": 10}, "7, 14 or 30"),
        ({"date": "2026-01-15", "window": 7, "hour": 24}, "0 and 23"),
        ({"date": "2026-01-15", "window": 7, "hour": -1}, "0 and 23"),
    ],
)
def test_accuracy_bad_query_is_422(
    client: TestClient, params: dict[str, str | int], message: str
) -> None:
    response = client.get("/api/accuracy", params=params)

    assert response.status_code == 422
    assert message in response.json()["detail"]
    assert "cache-control" not in response.headers


def test_accuracy_elexon_failure_is_502(failing_client: TestClient) -> None:
    response = failing_client.get("/api/accuracy", params={"date": "2026-01-15", "window": 7})

    assert response.status_code == 502
    assert "Elexon" in response.json()["detail"]
    assert "cache-control" not in response.headers


def test_accuracy_window_without_data_is_404(client: TestClient) -> None:
    # Window 25..31 Dec. The fixture actuals start on 1 Jan, so no hour can be scored.
    response = client.get("/api/accuracy", params={"date": "2026-01-02", "window": 7})

    assert response.status_code == 404
    assert "2025-12-25" in response.json()["detail"]
    assert "cache-control" not in response.headers


def test_delivery_day_without_pre_cutoff_forecast_is_502() -> None:
    for test_client in _client_with(FakeElexonClient(forecasts=[])):
        response = test_client.get("/api/delivery-day", params={"date": "2026-01-15"})

        assert response.status_code == 502
        assert "no wind forecast" in response.json()["detail"]
        assert "cache-control" not in response.headers


def test_repeated_accuracy_request_does_not_refetch() -> None:
    elexon = FakeElexonClient()
    for test_client in _client_with(elexon):
        params = {"date": "2026-01-15", "window": 7}
        first = test_client.get("/api/accuracy", params=params).json()
        calls = elexon.calls

        second = test_client.get("/api/accuracy", params=params).json()

        assert elexon.calls == calls
        assert second == first
