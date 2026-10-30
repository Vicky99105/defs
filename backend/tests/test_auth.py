import base64
import getpass
import json
from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_auth_service, get_elexon_client
from app.main import app
from app.services.auth import hash_password as cli
from app.services.auth.contract import (
    TOKEN_TTL_HOURS,
    AuthConfig,
    AuthNotConfigured,
    AuthService,
    InvalidCredentials,
    InvalidToken,
)
from app.services.auth.service import DefaultAuthService, hash_password, load_auth_config
from tests.fakes.elexon import FakeElexonClient

USERNAME = "analyst"
PASSWORD = "correct horse battery staple"
SECRET = "s" * 32
ITERATIONS = 1_000
NOW = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)


def _config(secret: str = SECRET) -> AuthConfig:
    return AuthConfig(
        username=USERNAME,
        password_hash=hash_password(PASSWORD, iterations=ITERATIONS),
        secret=secret,
    )


def _service(config: AuthConfig | None = None, now: datetime = NOW) -> AuthService:
    return DefaultAuthService(config or _config(), now=lambda: now)


def test_sign_in_with_correct_credentials_gives_a_token_that_verifies() -> None:
    service = _service()

    issued = service.sign_in(USERNAME, PASSWORD)

    assert service.verify(issued.token) == USERNAME


def test_wrong_password_raises_invalid_credentials() -> None:
    with pytest.raises(InvalidCredentials):
        _service().sign_in(USERNAME, "wrong password")


def test_wrong_username_raises_invalid_credentials() -> None:
    with pytest.raises(InvalidCredentials):
        _service().sign_in("someone-else", PASSWORD)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _tamper_payload(token: str) -> str:
    _, signature = token.split(".")
    forged = _b64(json.dumps({"sub": USERNAME, "exp": 9_999_999_999}).encode())
    return f"{forged}.{signature}"


def _tamper_signature(token: str) -> str:
    payload, signature = token.split(".")
    flipped = "A" if signature[0] != "A" else "B"
    return f"{payload}.{flipped}{signature[1:]}"


@pytest.mark.parametrize("tamper", [_tamper_payload, _tamper_signature])
def test_tampered_token_raises_invalid_token(tamper: Callable[[str], str]) -> None:
    service = _service()
    token = service.sign_in(USERNAME, PASSWORD).token

    with pytest.raises(InvalidToken):
        service.verify(tamper(token))


def test_token_signed_with_a_different_secret_raises_invalid_token() -> None:
    config = _config()
    other = DefaultAuthService(
        AuthConfig(config.username, config.password_hash, "o" * 32), now=lambda: NOW
    )
    token = other.sign_in(USERNAME, PASSWORD).token

    with pytest.raises(InvalidToken):
        _service(config).verify(token)


def test_token_is_valid_before_ttl_and_invalid_after() -> None:
    config = _config()
    issued = _service(config).sign_in(USERNAME, PASSWORD)
    ttl = timedelta(hours=TOKEN_TTL_HOURS)

    assert issued.expires_at == NOW + ttl
    assert _service(config, now=NOW + ttl - timedelta(seconds=1)).verify(issued.token) == USERNAME
    with pytest.raises(InvalidToken):
        _service(config, now=NOW + ttl).verify(issued.token)


def test_token_for_a_different_username_raises_invalid_token() -> None:
    config = _config()
    token = _service(config).sign_in(USERNAME, PASSWORD).token
    renamed = AuthConfig("someone-else", config.password_hash, config.secret)

    with pytest.raises(InvalidToken):
        _service(renamed).verify(token)


@pytest.mark.parametrize("token", ["", "garbage", "a.b.c", "!!!.???", "e30.e30", "e30.\u00e9"])
def test_malformed_token_raises_invalid_token(token: str) -> None:
    with pytest.raises(InvalidToken):
        _service().verify(token)


def test_hash_password_round_trip_uses_a_fresh_salt() -> None:
    first = hash_password(PASSWORD, iterations=ITERATIONS)
    second = hash_password(PASSWORD, iterations=ITERATIONS)

    assert first.startswith(f"pbkdf2_sha256${ITERATIONS}$")
    assert len(first.split("$")) == 4
    assert first != second
    for password_hash in (first, second):
        service = _service(AuthConfig(USERNAME, password_hash, SECRET))
        assert service.verify(service.sign_in(USERNAME, PASSWORD).token) == USERNAME


def _env() -> dict[str, str]:
    return {
        "AUTH_USERNAME": USERNAME,
        "AUTH_PASSWORD_HASH": hash_password(PASSWORD, iterations=ITERATIONS),
        "AUTH_SECRET": SECRET,
    }


def test_load_auth_config_reads_the_three_variables() -> None:
    env = _env()

    assert load_auth_config(env) == AuthConfig(
        username=USERNAME, password_hash=env["AUTH_PASSWORD_HASH"], secret=SECRET
    )


@pytest.mark.parametrize("name", ["AUTH_USERNAME", "AUTH_PASSWORD_HASH", "AUTH_SECRET"])
@pytest.mark.parametrize("missing", ["absent", "empty"])
def test_load_auth_config_rejects_a_missing_variable(name: str, missing: str) -> None:
    env = _env()
    if missing == "absent":
        del env[name]
    else:
        env[name] = ""

    with pytest.raises(AuthNotConfigured):
        load_auth_config(env)


def test_load_auth_config_rejects_a_secret_shorter_than_32_characters() -> None:
    env = _env()
    env["AUTH_SECRET"] = "s" * 31

    with pytest.raises(AuthNotConfigured):
        load_auth_config(env)


@pytest.mark.parametrize(
    "password_hash",
    [
        "plaintext",
        "md5$1000$c2FsdA$aGFzaA",
        "pbkdf2_sha256$many$c2FsdA$aGFzaA",
        "pbkdf2_sha256$0$c2FsdA$aGFzaA",
        "pbkdf2_sha256$1000$$aGFzaA",
        "pbkdf2_sha256$1000$c2FsdA$",
        "pbkdf2_sha256$1000$!!!!$aGFzaA",
        "pbkdf2_sha256$1000$c2FsdA$aGFzaA$extra",
    ],
)
def test_load_auth_config_rejects_a_malformed_password_hash(password_hash: str) -> None:
    env = _env()
    env["AUTH_PASSWORD_HASH"] = password_hash

    with pytest.raises(AuthNotConfigured):
        load_auth_config(env)


# HTTP


@pytest.fixture
def client() -> Iterator[TestClient]:
    service = DefaultAuthService(_config())
    app.dependency_overrides[get_auth_service] = lambda: service
    app.dependency_overrides[get_elexon_client] = lambda: FakeElexonClient()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_login_returns_a_token_and_is_not_stored(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"token", "expiresAt"}
    assert datetime.fromisoformat(body["expiresAt"]) > datetime.now(UTC)
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    ("username", "password"), [(USERNAME, "wrong password"), ("someone-else", PASSWORD)]
)
def test_login_with_wrong_credentials_is_401(
    client: TestClient, username: str, password: str
) -> None:
    response = client.post("/api/auth/login", json={"username": username, "password": password})

    assert response.status_code == 401
    assert response.json() == {"detail": "Wrong username or password"}


@pytest.fixture
def unconfigured_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    for name in ("AUTH_USERNAME", "AUTH_PASSWORD_HASH", "AUTH_SECRET"):
        monkeypatch.delenv(name, raising=False)
    get_auth_service.cache_clear()
    app.dependency_overrides[get_elexon_client] = lambda: FakeElexonClient()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        get_auth_service.cache_clear()


def test_login_when_not_configured_is_503(unconfigured_client: TestClient) -> None:
    response = unconfigured_client.post(
        "/api/auth/login", json={"username": USERNAME, "password": PASSWORD}
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Sign-in is not configured"}


def test_login_with_a_malformed_body_is_422(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"username": USERNAME})

    assert response.status_code == 422


PROTECTED = [
    ("/api/delivery-day", {"date": "2026-01-15"}),
    ("/api/accuracy", {"date": "2026-01-15", "window": "7"}),
]


@pytest.mark.parametrize(("path", "params"), PROTECTED)
def test_protected_route_without_a_token_is_401(
    client: TestClient, path: str, params: dict[str, str]
) -> None:
    response = client.get(path, params=params)

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in required"}
    assert response.headers["www-authenticate"] == "Bearer"
    assert "cache-control" not in response.headers


def _expired_token() -> str:
    long_ago = datetime.now(UTC) - timedelta(hours=TOKEN_TTL_HOURS + 1)
    return DefaultAuthService(_config(), now=lambda: long_ago).sign_in(USERNAME, PASSWORD).token


@pytest.mark.parametrize(("path", "params"), PROTECTED)
@pytest.mark.parametrize(
    "authorization",
    ["Bearer garbage", "Bearer a.b", "Basic dXNlcjpwYXNz", "Bearer", "expired"],
)
def test_protected_route_with_a_bad_token_is_401(
    client: TestClient, path: str, params: dict[str, str], authorization: str
) -> None:
    if authorization == "expired":
        authorization = f"Bearer {_expired_token()}"

    response = client.get(path, params=params, headers={"Authorization": authorization})

    assert response.status_code == 401
    assert response.json() == {"detail": "Sign in required"}
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize(("path", "params"), PROTECTED)
def test_protected_route_with_a_valid_token_is_200(
    client: TestClient, path: str, params: dict[str, str]
) -> None:
    token = client.post(
        "/api/auth/login", json={"username": USERNAME, "password": PASSWORD}
    ).json()["token"]

    response = client.get(path, params=params, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, max-age=3600"


@pytest.mark.parametrize(("path", "params"), PROTECTED)
def test_protected_route_when_not_configured_is_503(
    unconfigured_client: TestClient, path: str, params: dict[str, str]
) -> None:
    response = unconfigured_client.get(path, params=params)

    assert response.status_code == 503
    assert response.json() == {"detail": "Sign-in is not configured"}


def test_meta_is_public(client: TestClient) -> None:
    response = client.get("/api/meta")

    assert response.status_code == 200
    assert response.headers["cache-control"].startswith("public")


def test_cors_preflight_for_login_succeeds(client: TestClient) -> None:
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


# hash_password CLI


def _fake_getpass(monkeypatch: pytest.MonkeyPatch, answers: list[str]) -> None:
    replies = iter(answers)
    monkeypatch.setattr(getpass, "getpass", lambda prompt="": next(replies))


def test_cli_prints_only_the_hash(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _fake_getpass(monkeypatch, [PASSWORD, PASSWORD])

    cli.main(iterations=ITERATIONS)

    printed = capsys.readouterr().out.strip()
    assert printed.startswith(f"pbkdf2_sha256${ITERATIONS}$")
    assert PASSWORD not in printed
    service = _service(AuthConfig(USERNAME, printed, SECRET))
    assert service.verify(service.sign_in(USERNAME, PASSWORD).token) == USERNAME


def test_cli_refuses_a_mismatch(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _fake_getpass(monkeypatch, [PASSWORD, "something else"])

    with pytest.raises(SystemExit) as exit_info:
        cli.main(iterations=ITERATIONS)

    assert exit_info.value.code != 0
    assert capsys.readouterr().out == ""


def test_cli_refuses_an_empty_password(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    _fake_getpass(monkeypatch, ["", ""])

    with pytest.raises(SystemExit) as exit_info:
        cli.main(iterations=ITERATIONS)

    assert exit_info.value.code != 0
    assert capsys.readouterr().out == ""
