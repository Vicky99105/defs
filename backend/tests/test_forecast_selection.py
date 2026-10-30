from datetime import UTC, date, datetime

import pytest

from app.models.domain import ForecastVersion
from app.services.forecast_selection.contract import ForecastSelectionService
from app.services.forecast_selection.service import DefaultForecastSelectionService
from tests.fakes.elexon import fixture_forecasts


@pytest.fixture
def selection() -> ForecastSelectionService:
    return DefaultForecastSelectionService()


def test_decision_time_is_11_uk_time_on_the_day_before(
    selection: ForecastSelectionService,
) -> None:
    cutoff = selection.decision_time(date(2026, 1, 15))

    assert cutoff == datetime(2026, 1, 14, 11, 0, tzinfo=UTC)
    assert cutoff.tzinfo is not None


def _versions_for_day(day: date) -> list[ForecastVersion]:
    """Every fixture forecast whose target hour falls on `day` (UTC, January only)."""
    return [
        ForecastVersion(publish_time=r.publish_time, start_time=r.start_time, mw=r.generation)
        for r in fixture_forecasts()
        if r.start_time.date() == day
    ]


def test_selects_0930_publish_for_delivery_15_jan(selection: ForecastSelectionService) -> None:
    cutoff = selection.decision_time(date(2026, 1, 15))

    chosen = selection.decision_forecast(_versions_for_day(date(2026, 1, 15)), cutoff)

    assert len(chosen) == 24
    assert {v.publish_time for v in chosen.values()} == {datetime(2026, 1, 14, 9, 30, tzinfo=UTC)}
    midnight = chosen[datetime(2026, 1, 15, 0, 0, tzinfo=UTC)]
    assert midnight.mw == 15828


def test_late_1225_publish_on_15_jan_is_never_selected_for_delivery_16_jan(
    selection: ForecastSelectionService,
) -> None:
    # The 11:30 publish on 15 Jan arrived at 12:25. Delivery 16 Jan closes at 15 Jan 11:00,
    # so 12:25 is after the cutoff. The rule selects by publishTime only, so the decision
    # forecast must fall back to the 09:30 publish, not to "the 11:30 slot".
    late = datetime(2026, 1, 15, 12, 25, tzinfo=UTC)
    versions = _versions_for_day(date(2026, 1, 16))
    assert any(v.publish_time == late for v in versions), "fixture must contain the late publish"

    chosen = selection.decision_forecast(versions, selection.decision_time(date(2026, 1, 16)))

    assert len(chosen) == 24
    assert {v.publish_time for v in chosen.values()} == {datetime(2026, 1, 15, 9, 30, tzinfo=UTC)}


def test_version_published_exactly_at_cutoff_is_eligible(
    selection: ForecastSelectionService,
) -> None:
    cutoff = selection.decision_time(date(2026, 1, 15))
    hour = datetime(2026, 1, 15, 6, 0, tzinfo=UTC)
    versions = [
        ForecastVersion(
            publish_time=datetime(2026, 1, 14, 9, 30, tzinfo=UTC), start_time=hour, mw=1
        ),
        ForecastVersion(publish_time=cutoff, start_time=hour, mw=2),
    ]

    assert selection.decision_forecast(versions, cutoff)[hour].mw == 2


def test_hours_with_no_eligible_forecast_are_absent(selection: ForecastSelectionService) -> None:
    cutoff = selection.decision_time(date(2026, 1, 15))
    covered = datetime(2026, 1, 15, 0, 0, tzinfo=UTC)
    only_late = datetime(2026, 1, 15, 1, 0, tzinfo=UTC)
    versions = [
        ForecastVersion(
            publish_time=datetime(2026, 1, 14, 9, 30, tzinfo=UTC), start_time=covered, mw=1
        ),
        ForecastVersion(
            publish_time=datetime(2026, 1, 14, 11, 30, tzinfo=UTC), start_time=only_late, mw=2
        ),
    ]

    chosen = selection.decision_forecast(versions, cutoff)

    assert set(chosen) == {covered}
    assert selection.decision_forecast([], cutoff) == {}
