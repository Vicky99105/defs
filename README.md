# Wind Forecast Monitor

A web app for a UK energy utility's day-ahead trading team. It shows the latest national wind generation forecasts available at decision time, and measures how accurate those forecasts were against actual generation.

## Scope

- **Data source:** Elexon BMRS only.
  - Actual generation: `FUELHH` dataset, `fuelType = WIND`, 30-minute resolution.
  - Forecast generation: `WINDFOR` dataset, with `publishTime` marking when each forecast was created.
- **Period:** forecasts relevant to day-ahead purchase decisions made in January 2026.

## Stack

- Frontend: React
- Backend: Python
- Packaging: Docker
- Deployment: Vercel

## Status

Work in progress. Directory layout, setup steps and the deployed app link will be added as the build lands.
