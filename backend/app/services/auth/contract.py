from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

TOKEN_TTL_HOURS = 12


class InvalidCredentials(Exception):
    """The username or the password is wrong. The message never says which."""


class InvalidToken(Exception):
    """The bearer token is malformed, has a bad signature, or has expired."""


class AuthNotConfigured(Exception):
    """AUTH_USERNAME, AUTH_PASSWORD_HASH or AUTH_SECRET is missing or invalid."""


@dataclass(frozen=True)
class AuthConfig:
    username: str
    # "pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>", made by app.services.auth.hash_password.
    password_hash: str
    # HMAC key for tokens, at least 32 characters.
    secret: str


@dataclass(frozen=True)
class IssuedToken:
    token: str
    expires_at: datetime


class AuthService(Protocol):
    """One configured user, no database. Tokens are stateless and HMAC-signed."""

    def sign_in(self, username: str, password: str) -> IssuedToken:
        """A token valid for TOKEN_TTL_HOURS. Raises InvalidCredentials."""
        ...

    def verify(self, token: str) -> str:
        """The username the token was issued to. Raises InvalidToken."""
        ...
