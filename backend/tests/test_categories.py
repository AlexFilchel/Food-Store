import pytest
from sqlalchemy import select

from app.core.database import get_session_factory
from app.modules.categories.model import Category
from app.modules.identity.model import Role, User, UserRole


async def register_user(client, *, email: str, first_name: str = "Test", last_name: str = "User"):
    return await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": "StrongPass123!",
        },
    )


async def login_admin(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "Admin1234!"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def assign_role(*, email: str, role_code: str) -> None:
    async with get_session_factory()() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        role = (await session.execute(select(Role).where(Role.code == role_code))).scalar_one()
        session.add(UserRole(user_id=user.id, role_id=role.id))
        await session.commit()


@pytest.mark.asyncio
async def test_category_admin_crud_and_tree(client):
    admin_headers = await login_admin(client)

    root_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Bebidas", "sort_order": 5},
        headers=admin_headers,
    )
    assert root_response.status_code == 201
    root_payload = root_response.json()
    assert root_payload["slug"] == "bebidas"
    assert root_payload["parent_id"] is None

    child_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Gaseosas", "parent_id": root_payload["id"], "sort_order": 1},
        headers=admin_headers,
    )
    assert child_response.status_code == 201
    child_payload = child_response.json()

    list_response = await client.get("/api/v1/admin/categories?page=1&size=10", headers=admin_headers)
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 2
    assert [item["name"] for item in list_payload["items"]] == ["Gaseosas", "Bebidas"]

    tree_response = await client.get("/api/v1/admin/categories/tree", headers=admin_headers)
    assert tree_response.status_code == 200
    tree_payload = tree_response.json()
    assert len(tree_payload) == 1
    assert tree_payload[0]["name"] == "Bebidas"
    assert tree_payload[0]["children"][0]["name"] == "Gaseosas"

    detail_response = await client.get(f"/api/v1/admin/categories/{child_payload['id']}", headers=admin_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["name"] == "Gaseosas"

    update_response = await client.patch(
        f"/api/v1/admin/categories/{child_payload['id']}",
        json={"name": "Gaseosas Zero", "sort_order": 2},
        headers=admin_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["slug"] == "gaseosas-zero"

    delete_response = await client.delete(f"/api/v1/admin/categories/{child_payload['id']}", headers=admin_headers)
    assert delete_response.status_code == 204

    deleted_detail = await client.get(f"/api/v1/admin/categories/{child_payload['id']}", headers=admin_headers)
    assert deleted_detail.status_code == 404
    assert deleted_detail.json()["code"] == "CATEGORY_NOT_FOUND"


@pytest.mark.asyncio
async def test_category_routes_require_admin_role(client):
    non_admin = await register_user(client, email="client-categories@example.com")
    user_headers = {"Authorization": f"Bearer {non_admin.json()['access_token']}"}

    anonymous_response = await client.get("/api/v1/admin/categories?page=1&size=10")
    forbidden_response = await client.get("/api/v1/admin/categories?page=1&size=10", headers=user_headers)

    assert anonymous_response.status_code == 401
    assert anonymous_response.json()["code"] == "AUTH_INVALID_TOKEN"
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["code"] == "AUTH_FORBIDDEN"


@pytest.mark.asyncio
async def test_category_rejects_invalid_parent_duplicate_cycle_and_deleted_parent(client):
    admin_headers = await login_admin(client)

    root_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Despensa"},
        headers=admin_headers,
    )
    child_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Pastas", "parent_id": root_response.json()["id"]},
        headers=admin_headers,
    )

    missing_parent = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Inválida", "parent_id": 9_999},
        headers=admin_headers,
    )
    assert missing_parent.status_code == 400
    assert missing_parent.json()["code"] == "CATEGORY_INVALID_PARENT"

    duplicate = await client.post(
        "/api/v1/admin/categories",
        json={"name": "PASTAS", "parent_id": root_response.json()["id"]},
        headers=admin_headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "CATEGORY_DUPLICATE"

    self_parent = await client.patch(
        f"/api/v1/admin/categories/{root_response.json()['id']}",
        json={"parent_id": root_response.json()["id"]},
        headers=admin_headers,
    )
    assert self_parent.status_code == 409
    assert self_parent.json()["code"] == "CATEGORY_CYCLE_DETECTED"

    descendant_parent = await client.patch(
        f"/api/v1/admin/categories/{root_response.json()['id']}",
        json={"parent_id": child_response.json()["id"]},
        headers=admin_headers,
    )
    assert descendant_parent.status_code == 409
    assert descendant_parent.json()["code"] == "CATEGORY_CYCLE_DETECTED"

    delete_child = await client.delete(f"/api/v1/admin/categories/{child_response.json()['id']}", headers=admin_headers)
    assert delete_child.status_code == 204

    deleted_parent_ref = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Nueva", "parent_id": child_response.json()["id"]},
        headers=admin_headers,
    )
    assert deleted_parent_ref.status_code == 400
    assert deleted_parent_ref.json()["code"] == "CATEGORY_INVALID_PARENT"


@pytest.mark.asyncio
async def test_category_delete_restricts_active_children_and_allows_replacement_after_soft_delete(client):
    admin_headers = await login_admin(client)

    root_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Congelados"},
        headers=admin_headers,
    )
    child_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Helados", "parent_id": root_response.json()["id"]},
        headers=admin_headers,
    )

    blocked_delete = await client.delete(f"/api/v1/admin/categories/{root_response.json()['id']}", headers=admin_headers)
    assert blocked_delete.status_code == 409
    assert blocked_delete.json()["code"] == "CATEGORY_HAS_CHILDREN"

    deactivate_child = await client.patch(
        f"/api/v1/admin/categories/{child_response.json()['id']}",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert deactivate_child.status_code == 200

    delete_root = await client.delete(f"/api/v1/admin/categories/{root_response.json()['id']}", headers=admin_headers)
    assert delete_root.status_code == 204

    replacement_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Congelados"},
        headers=admin_headers,
    )
    assert replacement_response.status_code == 201


@pytest.mark.asyncio
async def test_category_include_inactive_and_parent_filter(client):
    admin_headers = await login_admin(client)

    root_response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Panadería"},
        headers=admin_headers,
    )
    first_child = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Facturas", "parent_id": root_response.json()["id"]},
        headers=admin_headers,
    )
    second_child = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Tortas", "parent_id": root_response.json()["id"], "is_active": False},
        headers=admin_headers,
    )
    assert first_child.status_code == 201
    assert second_child.status_code == 201

    filtered_list = await client.get(
        f"/api/v1/admin/categories?page=1&size=10&parent_id={root_response.json()['id']}",
        headers=admin_headers,
    )
    assert filtered_list.status_code == 200
    assert [item["name"] for item in filtered_list.json()["items"]] == ["Facturas"]

    with_inactive = await client.get(
        f"/api/v1/admin/categories?page=1&size=10&parent_id={root_response.json()['id']}&include_inactive=true",
        headers=admin_headers,
    )
    assert with_inactive.status_code == 200
    assert [item["name"] for item in with_inactive.json()["items"]] == ["Facturas", "Tortas"]

    tree_with_inactive = await client.get("/api/v1/admin/categories/tree?include_inactive=true", headers=admin_headers)
    tree_children = tree_with_inactive.json()[0]["children"]
    assert [item["name"] for item in tree_children] == ["Facturas", "Tortas"]


@pytest.mark.asyncio
async def test_category_allows_stock_and_orders_users_to_be_rejected_without_admin(client):
    stock_response = await register_user(client, email="stock-categories@example.com")
    orders_response = await register_user(client, email="orders-categories@example.com")
    await assign_role(email="stock-categories@example.com", role_code="STOCK")
    await assign_role(email="orders-categories@example.com", role_code="PEDIDOS")

    stock_headers = {"Authorization": f"Bearer {stock_response.json()['access_token']}"}
    orders_headers = {"Authorization": f"Bearer {orders_response.json()['access_token']}"}

    stock_result = await client.get("/api/v1/admin/categories?page=1&size=10", headers=stock_headers)
    orders_result = await client.get("/api/v1/admin/categories?page=1&size=10", headers=orders_headers)

    assert stock_result.status_code == 403
    assert orders_result.status_code == 403


@pytest.mark.asyncio
async def test_category_update_can_move_to_valid_parent(client):
    admin_headers = await login_admin(client)
    root_a = await client.post("/api/v1/admin/categories", json={"name": "Lácteos"}, headers=admin_headers)
    root_b = await client.post("/api/v1/admin/categories", json={"name": "Desayuno"}, headers=admin_headers)
    child = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Leche", "parent_id": root_a.json()["id"]},
        headers=admin_headers,
    )

    move_response = await client.patch(
        f"/api/v1/admin/categories/{child.json()['id']}",
        json={"parent_id": root_b.json()["id"]},
        headers=admin_headers,
    )

    assert move_response.status_code == 200
    assert move_response.json()["parent_id"] == root_b.json()["id"]

    async with get_session_factory()() as session:
        moved = (await session.execute(select(Category).where(Category.id == child.json()["id"]))).scalar_one()
        assert moved.parent_id == root_b.json()["id"]


@pytest.mark.asyncio
async def test_category_creation_returns_audit_timestamps_without_deleted_timestamp(client):
    admin_headers = await login_admin(client)

    response = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Auditable"},
        headers=admin_headers,
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["created_at"].endswith("Z")
    assert payload["updated_at"].endswith("Z")
    assert "deleted_at" not in payload


@pytest.mark.asyncio
async def test_category_soft_deleted_rows_are_excluded_from_default_list_and_tree(client):
    admin_headers = await login_admin(client)

    root = await client.post("/api/v1/admin/categories", json={"name": "Ocultables"}, headers=admin_headers)
    child = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Temporal", "parent_id": root.json()["id"]},
        headers=admin_headers,
    )
    delete_response = await client.delete(f"/api/v1/admin/categories/{child.json()['id']}", headers=admin_headers)
    assert delete_response.status_code == 204

    list_response = await client.get("/api/v1/admin/categories?page=1&size=10", headers=admin_headers)
    assert list_response.status_code == 200
    assert "Temporal" not in [item["name"] for item in list_response.json()["items"]]

    tree_response = await client.get("/api/v1/admin/categories/tree", headers=admin_headers)
    assert tree_response.status_code == 200
    assert tree_response.json()[0]["name"] == "Ocultables"
    assert tree_response.json()[0]["children"] == []


@pytest.mark.asyncio
async def test_category_update_rejects_duplicate_sibling_name(client):
    admin_headers = await login_admin(client)

    root = await client.post("/api/v1/admin/categories", json={"name": "Raíz Duplicada"}, headers=admin_headers)
    first = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Primera", "parent_id": root.json()["id"]},
        headers=admin_headers,
    )
    second = await client.post(
        "/api/v1/admin/categories",
        json={"name": "Segunda", "parent_id": root.json()["id"]},
        headers=admin_headers,
    )

    response = await client.patch(
        f"/api/v1/admin/categories/{second.json()['id']}",
        json={"name": first.json()["name"]},
        headers=admin_headers,
    )

    assert response.status_code == 409
    assert response.json()["code"] == "CATEGORY_DUPLICATE"


@pytest.mark.asyncio
async def test_category_update_rejects_missing_or_deleted_parent(client):
    admin_headers = await login_admin(client)

    category = await client.post("/api/v1/admin/categories", json={"name": "Movible"}, headers=admin_headers)
    deleted_parent = await client.post("/api/v1/admin/categories", json={"name": "Padre Borrado"}, headers=admin_headers)
    delete_response = await client.delete(f"/api/v1/admin/categories/{deleted_parent.json()['id']}", headers=admin_headers)
    assert delete_response.status_code == 204

    missing_parent = await client.patch(
        f"/api/v1/admin/categories/{category.json()['id']}",
        json={"parent_id": 9_999},
        headers=admin_headers,
    )
    assert missing_parent.status_code == 400
    assert missing_parent.json()["code"] == "CATEGORY_INVALID_PARENT"

    deleted_parent_response = await client.patch(
        f"/api/v1/admin/categories/{category.json()['id']}",
        json={"parent_id": deleted_parent.json()["id"]},
        headers=admin_headers,
    )
    assert deleted_parent_response.status_code == 400
    assert deleted_parent_response.json()["code"] == "CATEGORY_INVALID_PARENT"
