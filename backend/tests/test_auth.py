from datetime import timedelta

import pytest
from jose import jwt
from sqlalchemy import select

from app.core.config import get_settings
from app.core.time import utc_now
from app.modules.auth.dependencies import enforce_owner_or_roles, require_role
from app.modules.auth.errors import auth_forbidden
from app.modules.auth.rate_limiter import get_login_rate_limiter


async def register_user(client, *, email: str, first_name: str = "Ada", last_name: str = "Lovelace"):
    return await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": "StrongPass123!",
        },
    )


@pytest.mark.asyncio
async def test_register_assigns_client_role_and_returns_tokens(client):
    response = await register_user(client, email="ada@example.com")

    assert response.status_code == 201
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["user"]["roles"] == ["CLIENT"]
    assert payload["user"]["first_name"] == "Ada"
    assert "hashed_password" not in payload["user"]


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(client):
    await register_user(client, email="duplicate@example.com")
    response = await register_user(client, email="duplicate@example.com")

    assert response.status_code == 409
    assert response.json()["code"] == "AUTH_EMAIL_ALREADY_REGISTERED"


@pytest.mark.asyncio
async def test_register_rejects_weak_password_with_validation_errors(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "weak@example.com",
            "password": "123",
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert any(error["field"] == "body.password" for error in payload["errors"])


@pytest.mark.asyncio
async def test_register_rejects_passwords_over_bcrypt_byte_limit(client):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "too-long@example.com",
            "password": "á" * 37,
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert any(error["field"] == "body.password" for error in payload["errors"])


@pytest.mark.asyncio
async def test_login_returns_expected_claims_and_sanitized_user(client):
    await register_user(client, email="grace@example.com", first_name="Grace", last_name="Hopper")

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "grace@example.com", "password": "StrongPass123!"},
    )

    assert response.status_code == 200
    payload = response.json()
    decoded = jwt.decode(payload["access_token"], get_settings().secret_key, algorithms=["HS256"])
    assert decoded["email"] == "grace@example.com"
    assert decoded["roles"] == ["CLIENT"]
    assert decoded["sub"]
    assert payload["user"]["email"] == "grace@example.com"
    assert "hashed_password" not in payload["user"]


@pytest.mark.asyncio
async def test_login_rejects_invalid_credentials_without_user_enumeration(client):
    missing_user_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )
    await register_user(client, email="linus@example.com", first_name="Linus", last_name="Torvalds")
    wrong_password_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "linus@example.com", "password": "wrong-password"},
    )

    assert missing_user_response.status_code == 401
    assert wrong_password_response.status_code == 401
    assert missing_user_response.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    assert wrong_password_response.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    assert missing_user_response.json()["detail"] == wrong_password_response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_rotates_token_and_rejects_replay(client):
    register_response = await register_user(client, email="alan@example.com", first_name="Alan", last_name="Turing")
    refresh_token = register_response.json()["refresh_token"]

    refresh_response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})

    assert refresh_response.status_code == 200
    refreshed_payload = refresh_response.json()
    assert refreshed_payload["refresh_token"] != refresh_token

    replay_response = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert replay_response.status_code == 401
    assert replay_response.json()["code"] == "AUTH_REFRESH_REPLAY_DETECTED"


@pytest.mark.asyncio
async def test_refresh_rejects_expired_token(client):
    register_response = await register_user(client, email="tim@example.com", first_name="Tim", last_name="Berners-Lee")
    from app.core.database import get_session_factory
    from app.modules.auth.model import RefreshToken

    async with get_session_factory()() as session:
        token = (await session.execute(select(RefreshToken))).scalar_one()
        token.expires_at = utc_now() - timedelta(seconds=1)
        await session.commit()

    refresh_response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": register_response.json()["refresh_token"]},
    )

    assert refresh_response.status_code == 401
    assert refresh_response.json()["code"] == "AUTH_TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token_and_me_returns_current_user(client):
    register_response = await register_user(
        client,
        email="margaret@example.com",
        first_name="Margaret",
        last_name="Hamilton",
    )
    payload = register_response.json()
    auth_headers = {"Authorization": f"Bearer {payload['access_token']}"}

    me_response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_response.status_code == 200
    assert me_response.json()["roles"] == ["CLIENT"]

    logout_response = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": payload["refresh_token"]},
        headers=auth_headers,
    )
    assert logout_response.status_code == 204

    refresh_response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": payload["refresh_token"]},
    )
    assert refresh_response.status_code == 401
    assert refresh_response.json()["code"] == "AUTH_REFRESH_REPLAY_DETECTED"


@pytest.mark.asyncio
async def test_me_requires_valid_token(client):
    missing_token_response = await client.get("/api/v1/auth/me")
    invalid_token_response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid-token"})

    assert missing_token_response.status_code == 401
    assert invalid_token_response.status_code == 401
    assert missing_token_response.json()["code"] == "AUTH_INVALID_TOKEN"
    assert invalid_token_response.json()["code"] == "AUTH_INVALID_TOKEN"


@pytest.mark.asyncio
async def test_require_role_dependency_handles_admin_stock_pedidos_and_client_roles(client):
    from app.main import create_app
    from app.core.database import get_session_factory
    from fastapi import Depends
    from httpx import ASGITransport, AsyncClient
    from app.modules.identity.model import Role, User, UserRole

    client_response = await register_user(client, email="client@example.com", first_name="Client", last_name="User")
    stock_response = await register_user(client, email="stock@example.com", first_name="Stock", last_name="User")
    pedidos_response = await register_user(client, email="pedidos@example.com", first_name="Pedidos", last_name="User")
    admin_login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "Admin1234!"},
    )

    async with get_session_factory()() as session:
        roles = {
            role.code: role
            for role in (await session.execute(select(Role).where(Role.code.in_(["STOCK", "PEDIDOS"])))).scalars().all()
        }
        users = {
            user.email: user
            for user in (await session.execute(select(User).where(User.email.in_(["stock@example.com", "pedidos@example.com"]))))
            .scalars()
            .all()
        }
        session.add(UserRole(user_id=users["stock@example.com"].id, role_id=roles["STOCK"].id))
        session.add(UserRole(user_id=users["pedidos@example.com"].id, role_id=roles["PEDIDOS"].id))
        await session.commit()

    app = create_app()

    @app.get("/api/v1/auth-test/admin-only")
    async def privileged(_=Depends(require_role("ADMIN", "STOCK", "PEDIDOS"))):
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        admin_response = await test_client.get(
            "/api/v1/auth-test/admin-only",
            headers={"Authorization": f"Bearer {admin_login_response.json()['access_token']}"},
        )
        stock_allowed_response = await test_client.get(
            "/api/v1/auth-test/admin-only",
            headers={"Authorization": f"Bearer {stock_response.json()['access_token']}"},
        )
        pedidos_allowed_response = await test_client.get(
            "/api/v1/auth-test/admin-only",
            headers={"Authorization": f"Bearer {pedidos_response.json()['access_token']}"},
        )
        client_forbidden_response = await test_client.get(
            "/api/v1/auth-test/admin-only",
            headers={"Authorization": f"Bearer {client_response.json()['access_token']}"},
        )

    assert admin_response.status_code == 200
    assert stock_allowed_response.status_code == 200
    assert pedidos_allowed_response.status_code == 200
    assert client_forbidden_response.status_code == 403
    assert client_forbidden_response.json()["code"] == "AUTH_FORBIDDEN"


def test_ownership_helper_allows_owner_or_privileged_role():
    current_user = type("CurrentUser", (), {"id": 1})()

    enforce_owner_or_roles(
        current_user=current_user,
        owner_user_id=1,
        current_role_codes={"CLIENT"},
        allowed_roles={"ADMIN"},
    )
    enforce_owner_or_roles(
        current_user=current_user,
        owner_user_id=2,
        current_role_codes={"ADMIN"},
        allowed_roles={"ADMIN"},
    )

    with pytest.raises(type(auth_forbidden())) as exc_info:
        enforce_owner_or_roles(
            current_user=current_user,
            owner_user_id=2,
            current_role_codes={"CLIENT"},
            allowed_roles={"ADMIN", "STOCK", "PEDIDOS"},
        )
    assert exc_info.value.code == "AUTH_FORBIDDEN"


@pytest.mark.asyncio
async def test_login_rate_limiting_returns_retry_after(client):
    limiter = get_login_rate_limiter()
    limiter.clear("127.0.0.1")
    for _ in range(5):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "missing@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    rate_limited_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert rate_limited_response.status_code == 429
    assert rate_limited_response.json()["code"] == "AUTH_RATE_LIMITED"
    assert int(rate_limited_response.headers["Retry-After"]) >= 1
