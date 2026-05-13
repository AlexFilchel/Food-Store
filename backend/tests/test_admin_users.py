import pytest


async def login_admin(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "Admin1234!"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def login_user(client, *, email: str, password: str) -> dict[str, str] | None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    if response.status_code != 200:
        return None
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def create_admin_user(client, headers, *, email: str, roles: list[str], password: str = "StrongPass123!"):
    response = await client.post(
        "/api/v1/admin/users",
        json={
            "first_name": "Admin",
            "last_name": "Target",
            "email": email,
            "password": password,
            "role_codes": roles,
        },
        headers=headers,
    )
    return response


@pytest.mark.asyncio
async def test_admin_user_routes_require_admin(client):
    anon = await client.get("/api/v1/admin/users?page=1&size=10")
    assert anon.status_code == 401

    user = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "No",
            "last_name": "Admin",
            "email": "user-admin-guard@test.local",
            "password": "StrongPass123!",
        },
    )
    forbidden = await client.get(
        "/api/v1/admin/users?page=1&size=10",
        headers={"Authorization": f"Bearer {user.json()['access_token']}"},
    )
    assert forbidden.status_code == 403

    user_headers = {"Authorization": f"Bearer {user.json()['access_token']}"}
    create_payload = {
        "first_name": "No",
        "last_name": "Admin",
        "email": "no-admin@test.local",
        "password": "StrongPass123!",
        "role_codes": ["CLIENT"],
    }
    create_response = await client.post("/api/v1/admin/users", json=create_payload, headers=user_headers)
    assert create_response.status_code == 403

    detail_response = await client.get("/api/v1/admin/users/1", headers=user_headers)
    assert detail_response.status_code == 403

    patch_response = await client.patch(
        "/api/v1/admin/users/1",
        json={"first_name": "Nope"},
        headers=user_headers,
    )
    assert patch_response.status_code == 403

    role_response = await client.put(
        "/api/v1/admin/users/1/roles",
        json={"role_codes": ["CLIENT"]},
        headers=user_headers,
    )
    assert role_response.status_code == 403

    lifecycle_response = await client.put(
        "/api/v1/admin/users/1/lifecycle",
        json={"is_active": False},
        headers=user_headers,
    )
    assert lifecycle_response.status_code == 403

    reset_response = await client.post(
        "/api/v1/admin/users/1/password-reset",
        json={"new_password": "StrongPass123!"},
        headers=user_headers,
    )
    assert reset_response.status_code == 403


@pytest.mark.asyncio
async def test_admin_user_list_and_filters(client):
    headers = await login_admin(client)
    created = await create_admin_user(
        client,
        headers,
        email="list-admin@test.local",
        roles=["STOCK"],
    )
    assert created.status_code == 201

    listing = await client.get("/api/v1/admin/users?page=1&size=20", headers=headers)
    assert listing.status_code == 200
    listing_payload = listing.json()
    assert listing_payload["total"] >= 1
    assert listing_payload["page"] == 1
    assert listing_payload["size"] == 20

    by_role = await client.get("/api/v1/admin/users?page=1&size=20&role=STOCK", headers=headers)
    assert by_role.status_code == 200
    assert by_role.json()["total"] >= 1

    by_status = await client.get("/api/v1/admin/users?page=1&size=20&is_active=true", headers=headers)
    assert by_status.status_code == 200

    by_search = await client.get("/api/v1/admin/users?page=1&size=20&search=list-admin", headers=headers)
    assert by_search.status_code == 200
    assert by_search.json()["total"] == 1


@pytest.mark.asyncio
async def test_admin_user_detail_missing_user(client):
    headers = await login_admin(client)
    response = await client.get("/api/v1/admin/users/999999", headers=headers)
    assert response.status_code == 404
    assert response.json()["code"] == "ADMIN_USER_NOT_FOUND"


@pytest.mark.asyncio
async def test_admin_user_detail_excludes_secrets(client):
    headers = await login_admin(client)
    created = await create_admin_user(
        client,
        headers,
        email="secret-admin@test.local",
        roles=["STOCK"],
    )
    assert created.status_code == 201
    detail = await client.get(f"/api/v1/admin/users/{created.json()['id']}", headers=headers)
    assert detail.status_code == 200
    payload = detail.json()
    assert "hashed_password" not in payload
    assert "token_hash" not in payload


@pytest.mark.asyncio
async def test_admin_user_create_update_and_duplicate_email(client):
    headers = await login_admin(client)
    created = await create_admin_user(
        client,
        headers,
        email="create-admin@test.local",
        roles=["STOCK"],
    )
    assert created.status_code == 201
    payload = created.json()
    assert payload["email"] == "create-admin@test.local"
    assert "hashed_password" not in payload

    duplicate = await create_admin_user(
        client,
        headers,
        email="create-admin@test.local",
        roles=["STOCK"],
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "ADMIN_USER_DUPLICATE_EMAIL"

    invalid_role = await create_admin_user(
        client,
        headers,
        email="invalid-role@test.local",
        roles=["UNKNOWN"],
    )
    assert invalid_role.status_code == 400
    assert invalid_role.json()["code"] == "ADMIN_USER_INVALID_ROLE"

    updated = await client.patch(
        f"/api/v1/admin/users/{payload['id']}",
        json={"first_name": "Updated", "last_name": "Name"},
        headers=headers,
    )
    assert updated.status_code == 200
    updated_payload = updated.json()
    assert updated_payload["first_name"] == "Updated"
    assert "hashed_password" not in updated_payload


@pytest.mark.asyncio
async def test_admin_user_role_update_and_last_admin_guard(client):
    headers = await login_admin(client)
    admin_detail = await client.get("/api/v1/admin/users/1", headers=headers)
    assert admin_detail.status_code == 200
    admin_user_id = admin_detail.json()["id"]

    response = await client.put(
        f"/api/v1/admin/users/{admin_user_id}/roles",
        json={"role_codes": ["CLIENT"]},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["code"] == "ADMIN_USER_LAST_ADMIN_FORBIDDEN"

    target = await create_admin_user(
        client,
        headers,
        email="role-admin@test.local",
        roles=["STOCK"],
    )
    assert target.status_code == 201
    target_id = target.json()["id"]

    role_update = await client.put(
        f"/api/v1/admin/users/{target_id}/roles",
        json={"role_codes": ["ADMIN", "STOCK"]},
        headers=headers,
    )
    assert role_update.status_code == 200
    assert "ADMIN" in role_update.json()["roles"]


@pytest.mark.asyncio
async def test_admin_user_lifecycle_and_password_reset(client):
    headers = await login_admin(client)
    target = await create_admin_user(
        client,
        headers,
        email="lifecycle-admin@test.local",
        roles=["STOCK"],
    )
    assert target.status_code == 201
    target_id = target.json()["id"]

    deactivate = await client.put(
        f"/api/v1/admin/users/{target_id}/lifecycle",
        json={"is_active": False},
        headers=headers,
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    login_inactive = await client.post(
        "/api/v1/auth/login",
        json={"email": "lifecycle-admin@test.local", "password": "StrongPass123!"},
    )
    assert login_inactive.status_code == 401

    weak_reset = await client.post(
        f"/api/v1/admin/users/{target_id}/password-reset",
        json={"new_password": "123"},
        headers=headers,
    )
    assert weak_reset.status_code == 422

    reset = await client.post(
        f"/api/v1/admin/users/{target_id}/password-reset",
        json={"new_password": "NewStrongPass123!"},
        headers=headers,
    )
    assert reset.status_code == 200
    assert reset.json()["user_id"] == target_id

    activate = await client.put(
        f"/api/v1/admin/users/{target_id}/lifecycle",
        json={"is_active": True},
        headers=headers,
    )
    assert activate.status_code == 200
    assert activate.json()["is_active"] is True

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "lifecycle-admin@test.local", "password": "StrongPass123!"},
    )
    assert old_login.status_code == 401

    new_login = await login_user(client, email="lifecycle-admin@test.local", password="NewStrongPass123!")
    assert new_login is not None

    reset_again = await client.post(
        f"/api/v1/admin/users/{target_id}/password-reset",
        json={"new_password": "AnotherStrongPass123!"},
        headers=headers,
    )
    assert reset_again.status_code == 200

    old_login_invalid = await client.post(
        "/api/v1/auth/login",
        json={"email": "lifecycle-admin@test.local", "password": "NewStrongPass123!"},
    )
    assert old_login_invalid.status_code == 401

    new_login_valid = await login_user(client, email="lifecycle-admin@test.local", password="AnotherStrongPass123!")
    assert new_login_valid is not None
