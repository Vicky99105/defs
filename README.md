# Wind Desk

A dashboard for a UK energy utility's day-ahead trading team. Before the 11:00 GB day-ahead auction, the team decides how much power to buy for each hour of tomorrow. Wind Desk shows them:

1. **The forecast they actually have at decision time:** the latest Elexon national wind forecast (WINDFOR) published before 11:00 UK time on the day before delivery, plus every earlier version.
2. **How wrong that forecast has been:** typical error, bias and error trend over the last 7, 14 or 30 days, with charts of past errors, forecast vs actual, and error by lead time. Actuals come from Elexon FUELHH (fuel type WIND).

All data is fetched live from the Elexon BMRS API. There is no database.

**Live app:** https://wind-desk-one.vercel.app (API: https://wind-desk-api-theta.vercel.app/api/meta)

## How to start

### With Docker

```bash
docker compose up --build
```

- UI: http://localhost:5173
- API: http://localhost:8000/api/meta

### Without Docker

Requirements: Python 3.11+ with [uv](https://docs.astral.sh/uv/), Node 22 with pnpm 10.

```bash
# API on :8000
cd backend
uv sync
uv run --group serve uvicorn app.main:app --port 8000
```

```bash
# UI on :5173 (in a second terminal)
cd ui
pnpm install
pnpm dev
```

The UI calls the API at `VITE_API_BASE` (default `http://localhost:8000`). The API allows browser origins from `ALLOWED_ORIGINS` (comma separated, default `http://localhost:5173`).

### Checks

```bash
cd backend && uv run pytest -q && uv run ruff check . && uv run mypy app tests
cd ui && pnpm exec tsc -b && pnpm lint && pnpm build
```

## Files and directories

```
backend/                     Python 3.12, FastAPI. Deployed as its own Vercel project.
  app/main.py                App, CORS, routers.
  app/api/routes/            Thin HTTP handlers: meta, delivery_day, accuracy.
  app/api/deps.py            The only place that wires implementations to contracts.
  app/integrations/elexon/   ElexonClient contract + DefaultElexonClient (httpx, 7-day chunks fetched in parallel).
  app/services/
    wind_data/               Fetch, dedupe FUELHH, half-hour to hour, in-process cache.
    forecast_selection/      The decision rule: latest publish at or before 11:00 UK on D-1.
    delivery_day/            Decision forecast, earlier versions, peak, low, biggest revision.
    accuracy/                Typical error, bias, trend, per-hour errors, lead-time buckets.
  app/models/                Domain types and camelCase API response models.
  tests/                     pytest through contracts and HTTP, using FakeElexonClient.
ui/                          React, Vite, TypeScript, Tailwind v4, ECharts. Own Vercel project.
  src/routes/Dashboard.tsx   Page composition and loading, empty and error states.
  src/components/            Grouped by feature: shell, filters, kpis, delivery-forecast,
                             past-errors, forecast-vs-actual, lead-time, ui (shared primitives).
  src/hooks/                 Data queries (TanStack Query), URL filter state, theme.
  src/lib/                   API types and client, formatting, chart styling, observations.
data/                        Raw January 2026 Elexon JSON. Test fixtures only; the app never reads it.
docker-compose.yml           Runs backend and ui together.
.github/workflows/ci.yml     Validate (backend, ui, docker smoke test), then deploy.
```

Each service has a `contract.py` (a `Protocol`) and a `service.py` (`Default*` implementation). Routes and other services import contracts only, so tests swap in fakes without patching internals.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/meta` | Allowed delivery dates, decision time, time zone, history windows |
| `GET /api/delivery-day?date=2026-01-15` | Decision forecast (24 hourly points), earlier pre-cutoff versions, peak, low, biggest revision |
| `GET /api/accuracy?date=2026-01-15&window=7&hour=18` | Period and previous period, KPIs, per-hour errors, lead-time buckets. `hour` is optional. |

Errors: 422 for invalid input, 404 when a history window has no data, 502 when Elexon fails. Past-data responses carry `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.

## Method and assumptions

- **Decision time:** 11:00 UK time on the day before delivery, the GB day-ahead auction close.
- **Delivery day:** 00:00 to 24:00 UK time. Delivery dates 2 Jan to 1 Feb 2026, which covers every decision made in January 2026.
- **Decision forecast:** for each hour, the latest WINDFOR value with `publishTime` at or before the decision time. Selection uses the real `publishTime`, never an assumed schedule (the 15 Jan 11:30 publish actually arrived at 12:25).
- **Hourly actual:** mean of the two FUELHH half-hours in the hour (FUELHH values are average MW over 30 minutes). Repeated FUELHH rows keep the latest publish.
- **Error** = forecast minus actual, in MW. **Typical error** = mean of absolute errors (MAE). **Bias** = mean error; positive means the forecast ran above actual. **Error trend** = typical error of the window minus the equal-length window just before it.
- **History window** for delivery day D ends on D-2, so every hour in it had a known actual at decision time. History may reach back into December 2025, because a trader deciding on 2 January would look at December.
- **Why these metrics:** the IEA Wind Task 36 Recommended Practice names MAE as the primary metric for trading and lists MAE and bias as the baseline set; grid operators (NESO, ISO-NE) report the same pair. Percent-of-hours and percentile tiles were considered and dropped because no trader-facing product uses them.
- **Golden numbers** (tested): delivery 15 Jan, 7-day window, all hours: 168 hours, typical error 2,354 MW, bias 1,863 MW.

## Known limits

- National wind only, Elexon only, by design. No demand, price or capacity data, so errors are in MW rather than % of capacity.
- The cache is in-process. On Vercel each warm instance keeps its own cache; the CDN cache headers cover repeat requests.
- The UI bundle includes ECharts (about 183 kB gzip), loaded lazily after the first paint.

## Deployment

Two Vercel projects: `wind-desk-api` from `backend/` (FastAPI, detected via `[tool.vercel] entrypoint` in `pyproject.toml`) and `wind-desk` from `ui/` (Vite, with `VITE_API_BASE` set to the API URL). The API's `ALLOWED_ORIGINS` is set to the UI URL. CI deploys only after every validation job passes. The deploy job needs these GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_UI`. Without them, the job skips the deploy step.

## Use of AI tools

This project was built with AI assistance. Claude Code (Anthropic) was used for research (Elexon API behaviour, forecast-evaluation standards, how trading platforms present accuracy), the UI mockup iterations, implementation of the backend and frontend under test-first discipline, and drafting this README. Design decisions, metric choices and every iteration of the UI were reviewed and directed by the author.
