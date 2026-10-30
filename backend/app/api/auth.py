from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.deps import get_auth_service
from app.services.auth.contract import AuthService, InvalidToken

_bearer = HTTPBearer(auto_error=False)


def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> str:
    """The signed-in username. A missing or invalid bearer token is a 401."""
    try:
        if credentials is None:
            raise InvalidToken
        return service.verify(credentials.credentials)
    except InvalidToken as exc:
        raise HTTPException(
            status_code=401, detail="Sign in required", headers={"WWW-Authenticate": "Bearer"}
        ) from exc
