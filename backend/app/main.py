import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import accuracy, delivery_day, meta

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173"


def allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title="Wind Desk API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(meta.router)
app.include_router(delivery_day.router)
app.include_router(accuracy.router)
