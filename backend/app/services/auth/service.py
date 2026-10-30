import base64
import hashlib
import hmac
import json
import secrets
from collections.abc import Callable, Mapping
from datetime import UTC, datetime, timedelta

from app.services.auth.contract import (
    TOKEN_TTL_HOURS,
    AuthConfig,
    AuthNotConfigured,
    InvalidCredentials,
    InvalidToken,
    IssuedToken,
)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    """Strict url-safe decode. Raises ValueError on any character outside the alphabet."""
    return base64.b64decode(text + "=" * (-len(text) % 4), altchars=b"-_", validate=True)


def _is_valid_hash(password_hash: str) -> bool:
    parts = password_hash.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256" or not parts[1].isdigit():
        return False
    try:
        return int(parts[1]) > 0 and bool(_unb64(parts[2])) and bool(_unb64(parts[3]))
    except ValueError:
        return False


def hash_password(password: str, iterations: int = 600_000) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${_b64(salt)}${_b64(digest)}"


def _password_matches(password: str, password_hash: str) -> bool:
    _, iterations, salt, expected = password_hash.split("$")
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), _unb64(salt), int(iterations))
    return hmac.compare_digest(digest, _unb64(expected))


def load_auth_config(env: Mapping[str, str]) -> AuthConfig:
    names = ("AUTH_USERNAME", "AUTH_PASSWORD_HASH", "AUTH_SECRET")
    missing = [name for name in names if not env.get(name)]
    if missing:
        raise AuthNotConfigured(f"Missing {', '.join(missing)}")
    if not _is_valid_hash(env["AUTH_PASSWORD_HASH"]):
        raise AuthNotConfigured("AUTH_PASSWORD_HASH is not a pbkdf2_sha256 hash")
    if len(env["AUTH_SECRET"]) < 32:
        raise AuthNotConfigured("AUTH_SECRET must be at least 32 characters")
    return AuthConfig(
        username=env["AUTH_USERNAME"],
        password_hash=env["AUTH_PASSWORD_HASH"],
        secret=env["AUTH_SECRET"],
    )


def _utc_now() -> datetime:
    return datetime.now(UTC)


class DefaultAuthService:
    """Token format: b64url(json {"sub", "exp"}) "." b64url(hmac_sha256(secret, payload))."""

    def __init__(self, config: AuthConfig, now: Callable[[], datetime] = _utc_now) -> None:
        self._config = config
        self._now = now

    def _sign(self, payload: str) -> bytes:
        return hmac.new(self._config.secret.encode(), payload.encode(), hashlib.sha256).digest()

    def sign_in(self, username: str, password: str) -> IssuedToken:
        # Run the PBKDF2 check even when the username is wrong, so timing does not
        # reveal which field failed.
        username_ok = hmac.compare_digest(username.encode(), self._config.username.encode())
        password_ok = _password_matches(password, self._config.password_hash)
        if not (username_ok and password_ok):
            raise InvalidCredentials
        expires_at = self._now() + timedelta(hours=TOKEN_TTL_HOURS)
        payload = _b64(json.dumps({"sub": username, "exp": int(expires_at.timestamp())}).encode())
        return IssuedToken(token=f"{payload}.{_b64(self._sign(payload))}", expires_at=expires_at)

    def verify(self, token: str) -> str:
        try:
            payload, signature = token.split(".")
            given = _unb64(signature)
        except ValueError:
            raise InvalidToken from None
        if not hmac.compare_digest(given, self._sign(payload)):
            raise InvalidToken
        # The signature is ours, so the payload is JSON we wrote.
        claims = json.loads(_unb64(payload))
        if self._now().timestamp() >= claims["exp"] or claims["sub"] != self._config.username:
            raise InvalidToken
        return self._config.username
