import pytest


async def register_user(client, *, email: str, password: str = "StrongPass123!", first_name: str = "Ada", last_name: str = "Lovelace"):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": password,
        },
    )
    return response


@pytest.mark.asyncio
async def test_profile_retrieval_returns_public_fields_only(client):
    register_response = await register_user(client, email="profile@example.com")
    token = register_response.json()["access_token"]

    response = await client.get("/api/v1/customer/profile", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    payload = response.json()
    registered_user = register_response.json()["user"]
    assert payload["id"] == registered_user["id"]
    assert payload["first_name"] == "Ada"
    assert payload["last_name"] == "Lovelace"
    assert payload["email"] == "profile@example.com"
    assert payload["roles"] == ["CLIENT"]
    assert isinstance(payload["created_at"], str)
    assert "hashed_password" not in payload
    assert "token_hash" not in payload
    assert "security_context" not in payload


@pytest.mark.asyncio
async def test_profile_endpoints_require_authentication(client):
    get_response = await client.get("/api/v1/customer/profile")
    patch_response = await client.patch(
        "/api/v1/customer/profile",
        json={"first_name": "A", "last_name": "B", "email": "a@example.com"},
    )
    password_response = await client.post(
        "/api/v1/customer/profile/change-password",
        json={"current_password": "StrongPass123!", "new_password": "OtherPass123!"},
    )

    assert get_response.status_code == 401
    assert patch_response.status_code == 401
    assert password_response.status_code == 401
    assert get_response.json()["code"] == "AUTH_INVALID_TOKEN"


@pytest.mark.asyncio
async def test_profile_update_changes_only_current_user_and_recomputes_full_name(client):
    first_user = await register_user(client, email="owner@example.com")
    other_user = await register_user(client, email="other@example.com", first_name="Other", last_name="User")
    headers = {"Authorization": f"Bearer {first_user.json()['access_token']}"}

    update_response = await client.patch(
        "/api/v1/customer/profile",
        headers=headers,
        json={
            "user_id": other_user.json()["user"]["id"],
            "first_name": "Grace",
            "last_name": "Hopper",
            "email": "grace@example.com",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["first_name"] == "Grace"

    own_profile = await client.get("/api/v1/customer/profile", headers=headers)
    assert own_profile.status_code == 200
    assert own_profile.json()["email"] == "grace@example.com"

    other_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@example.com", "password": "StrongPass123!"},
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
    other_profile = await client.get("/api/v1/customer/profile", headers=other_headers)
    assert other_profile.status_code == 200
    assert other_profile.json()["first_name"] == "Other"
    assert other_profile.json()["email"] == "other@example.com"


@pytest.mark.asyncio
async def test_profile_update_rejects_duplicate_email(client):
    owner = await register_user(client, email="owner2@example.com")
    await register_user(client, email="taken@example.com")

    response = await client.patch(
        "/api/v1/customer/profile",
        headers={"Authorization": f"Bearer {owner.json()['access_token']}"},
        json={"first_name": "Owner", "last_name": "Two", "email": "taken@example.com"},
    )

    assert response.status_code == 409
    assert response.json()["code"] == "CUSTOMER_PROFILE_DUPLICATE_EMAIL"


@pytest.mark.asyncio
async def test_profile_update_rejects_invalid_payload(client):
    owner = await register_user(client, email="validation@example.com")

    response = await client.patch(
        "/api/v1/customer/profile",
        headers={"Authorization": f"Bearer {owner.json()['access_token']}"},
        json={"first_name": "", "last_name": "", "email": "not-an-email"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_password_change_succeeds_with_correct_current_password(client):
    owner = await register_user(client, email="password-ok@example.com")

    response = await client.post(
        "/api/v1/customer/profile/change-password",
        headers={"Authorization": f"Bearer {owner.json()['access_token']}"},
        json={"current_password": "StrongPass123!", "new_password": "BetterPass123!"},
    )

    assert response.status_code == 204


@pytest.mark.asyncio
async def test_password_change_rejects_invalid_current_password(client):
    owner = await register_user(client, email="password-bad@example.com")

    response = await client.post(
        "/api/v1/customer/profile/change-password",
        headers={"Authorization": f"Bearer {owner.json()['access_token']}"},
        json={"current_password": "WrongPass123!", "new_password": "BetterPass123!"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "CUSTOMER_PROFILE_INVALID_CURRENT_PASSWORD"


@pytest.mark.asyncio
async def test_password_change_rejects_weak_new_password(client):
    owner = await register_user(client, email="password-weak@example.com")

    response = await client.post(
        "/api/v1/customer/profile/change-password",
        headers={"Authorization": f"Bearer {owner.json()['access_token']}"},
        json={"current_password": "StrongPass123!", "new_password": "short"},
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["title"] == "Validation Error"
    assert payload["status"] == 422
    assert payload["detail"] == "The request contains invalid fields."
    assert {error["field"] for error in payload["errors"]} == {"body.new_password"}


@pytest.mark.asyncio
async def test_password_change_new_password_works_old_password_stops_working(client):
    await register_user(client, email="change-login@example.com")

    login_before = await client.post(
        "/api/v1/auth/login",
        json={"email": "change-login@example.com", "password": "StrongPass123!"},
    )
    assert login_before.status_code == 200

    change_response = await client.post(
        "/api/v1/customer/profile/change-password",
        headers={"Authorization": f"Bearer {login_before.json()['access_token']}"},
        json={"current_password": "StrongPass123!", "new_password": "NewPass12345!"},
    )
    assert change_response.status_code == 204

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "change-login@example.com", "password": "StrongPass123!"},
    )
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "change-login@example.com", "password": "NewPass12345!"},
    )

    assert old_login.status_code == 401
    assert old_login.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    assert new_login.status_code == 200
