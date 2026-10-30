import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import accuracy, auth, delivery_day, meta
from app.services.auth.contract import AuthNotConfigured

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173"


def allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title="Wind Desk API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(AuthNotConfigured)
def auth_not_configured(_: Request, __: AuthNotConfigured) -> JSONResponse:
    # get_auth_service raises this when AUTH_* is missing or invalid. The exception
    # message names the variable; the caller only gets a generic reason.
    return JSONResponse(status_code=503, content={"detail": "Sign-in is not configured"})


app.include_router(meta.router)
app.include_router(auth.router)
app.include_router(delivery_day.router)
app.include_router(accuracy.router)
