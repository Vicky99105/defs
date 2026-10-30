from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import get_auth_service
from app.models.api import ErrorResponse, LoginRequest, LoginResponse
from app.services.auth.contract import AuthService, InvalidCredentials

router = APIRouter()


@router.post(
    "/api/auth/login",
    response_model=LoginResponse,
    responses={401: {"model": ErrorResponse}},
)
def login(
    body: LoginRequest,
    response: Response,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> LoginResponse:
    try:
        issued = service.sign_in(body.username, body.password)
    except InvalidCredentials as exc:
        raise HTTPException(status_code=401, detail="Wrong username or password") from exc
    response.headers["Cache-Control"] = "no-store"
    return LoginResponse(token=issued.token, expires_at=issued.expires_at)
