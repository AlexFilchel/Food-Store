import pytest


async def login_admin(client):
    response = await client.post("/api/v1/auth/login", json={"email": "admin@test.local", "password": "Admin1234!"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.mark.asyncio
async def test_ingredient_allergen_crud_and_rules(client):
    headers = await login_admin(client)

    allergen = await client.post("/api/v1/admin/allergens", json={"name": "Gluten"}, headers=headers)
    assert allergen.status_code == 201
    allergen_id = allergen.json()["id"]

    ingredient = await client.post(
        "/api/v1/admin/ingredients",
        json={"name": "Pan", "allergen_ids": [allergen_id]},
        headers=headers,
    )
    assert ingredient.status_code == 201
    ingredient_id = ingredient.json()["id"]
    assert ingredient.json()["allergens"][0]["name"] == "Gluten"

    detail = await client.get(f"/api/v1/admin/ingredients/{ingredient_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == ingredient_id
    assert detail.json()["allergens"][0]["id"] == allergen_id

    duplicate = await client.post("/api/v1/admin/ingredients", json={"name": "PAN"}, headers=headers)
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "INGREDIENT_DUPLICATE"

    invalid_allergen = await client.patch(
        f"/api/v1/admin/ingredients/{ingredient_id}",
        json={"allergen_ids": [99999]},
        headers=headers,
    )
    assert invalid_allergen.status_code == 400
    assert invalid_allergen.json()["code"] == "INGREDIENT_INVALID_ALLERGEN"

    inactive_allergen = await client.post("/api/v1/admin/allergens", json={"name": "Maní", "is_active": False}, headers=headers)
    inactive_invalid = await client.patch(
        f"/api/v1/admin/ingredients/{ingredient_id}",
        json={"allergen_ids": [inactive_allergen.json()["id"]]},
        headers=headers,
    )
    assert inactive_invalid.status_code == 400
    assert inactive_invalid.json()["code"] == "INGREDIENT_INVALID_ALLERGEN"

    deleted_allergen = await client.post("/api/v1/admin/allergens", json={"name": "Mostaza"}, headers=headers)
    deleted_allergen_id = deleted_allergen.json()["id"]
    assert (await client.delete(f"/api/v1/admin/allergens/{deleted_allergen_id}", headers=headers)).status_code == 204
    deleted_invalid = await client.patch(
        f"/api/v1/admin/ingredients/{ingredient_id}",
        json={"allergen_ids": [deleted_allergen_id]},
        headers=headers,
    )
    assert deleted_invalid.status_code == 400
    assert deleted_invalid.json()["code"] == "INGREDIENT_INVALID_ALLERGEN"

    create_allergen_2 = await client.post("/api/v1/admin/allergens", json={"name": "Lácteos"}, headers=headers)
    second_allergen_id = create_allergen_2.json()["id"]
    replace_assoc = await client.patch(
        f"/api/v1/admin/ingredients/{ingredient_id}",
        json={"allergen_ids": [second_allergen_id]},
        headers=headers,
    )
    assert replace_assoc.status_code == 200
    assert [item["id"] for item in replace_assoc.json()["allergens"]] == [second_allergen_id]

    keep_assoc = await client.patch(
        f"/api/v1/admin/ingredients/{ingredient_id}",
        json={"description": "Actualizado"},
        headers=headers,
    )
    assert keep_assoc.status_code == 200
    assert [item["id"] for item in keep_assoc.json()["allergens"]] == [second_allergen_id]

    list_response = await client.get("/api/v1/admin/ingredients?page=1&size=20", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["id"] == ingredient_id

    in_use = await client.delete(f"/api/v1/admin/allergens/{second_allergen_id}", headers=headers)
    assert in_use.status_code == 409
    assert in_use.json()["code"] == "ALLERGEN_IN_USE"

    delete_ingredient = await client.delete(f"/api/v1/admin/ingredients/{ingredient_id}", headers=headers)
    assert delete_ingredient.status_code == 204
    list_after_delete = await client.get("/api/v1/admin/ingredients?page=1&size=20", headers=headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["items"] == []

    deleted_detail = await client.get(f"/api/v1/admin/ingredients/{ingredient_id}", headers=headers)
    assert deleted_detail.status_code == 404
    assert deleted_detail.json()["code"] == "INGREDIENT_NOT_FOUND"

    replacement = await client.post("/api/v1/admin/ingredients", json={"name": "Pan"}, headers=headers)
    assert replacement.status_code == 201
    assert replacement.json()["slug"] == "pan"

    delete_allergen = await client.delete(f"/api/v1/admin/allergens/{second_allergen_id}", headers=headers)
    assert delete_allergen.status_code == 204


@pytest.mark.asyncio
async def test_allergen_crud_uniqueness_soft_delete_and_rbac(client):
    headers = await login_admin(client)

    allergen = await client.post("/api/v1/admin/allergens", json={"name": "Sésamo", "description": "Semillas"}, headers=headers)
    assert allergen.status_code == 201
    allergen_id = allergen.json()["id"]

    detail = await client.get(f"/api/v1/admin/allergens/{allergen_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["name"] == "Sésamo"

    duplicate = await client.post("/api/v1/admin/allergens", json={"name": "SESAMO"}, headers=headers)
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "ALLERGEN_DUPLICATE"

    updated = await client.patch(f"/api/v1/admin/allergens/{allergen_id}", json={"name": "Sésamo blanco"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["slug"] == "sesamo-blanco"

    list_response = await client.get("/api/v1/admin/allergens?page=1&size=20", headers=headers)
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [allergen_id]

    delete_response = await client.delete(f"/api/v1/admin/allergens/{allergen_id}", headers=headers)
    assert delete_response.status_code == 204

    list_after_delete = await client.get("/api/v1/admin/allergens?page=1&size=20", headers=headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json()["items"] == []

    deleted_detail = await client.get(f"/api/v1/admin/allergens/{allergen_id}", headers=headers)
    assert deleted_detail.status_code == 404
    assert deleted_detail.json()["code"] == "ALLERGEN_NOT_FOUND"

    replacement = await client.post("/api/v1/admin/allergens", json={"name": "Sésamo blanco"}, headers=headers)
    assert replacement.status_code == 201
    assert replacement.json()["slug"] == "sesamo-blanco"

    anon = await client.get("/api/v1/admin/allergens?page=1&size=20")
    assert anon.status_code == 401

    user = await client.post(
        "/api/v1/auth/register",
        json={"first_name": "No", "last_name": "Allergen", "email": "allergen-user@test.local", "password": "StrongPass123!"},
    )
    user_headers = {"Authorization": f"Bearer {user.json()['access_token']}"}
    forbidden = await client.get("/api/v1/admin/allergens?page=1&size=20", headers=user_headers)
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_include_inactive_for_ingredients_and_allergens(client):
    headers = await login_admin(client)

    inactive_allergen = await client.post("/api/v1/admin/allergens", json={"name": "Sulfitos", "is_active": False}, headers=headers)
    inactive_ingredient = await client.post("/api/v1/admin/ingredients", json={"name": "Vino", "is_active": False}, headers=headers)

    default_allergens = await client.get("/api/v1/admin/allergens?page=1&size=20", headers=headers)
    assert default_allergens.status_code == 200
    assert default_allergens.json()["items"] == []

    include_allergens = await client.get("/api/v1/admin/allergens?page=1&size=20&include_inactive=true", headers=headers)
    assert include_allergens.status_code == 200
    assert [item["id"] for item in include_allergens.json()["items"]] == [inactive_allergen.json()["id"]]

    default_ingredients = await client.get("/api/v1/admin/ingredients?page=1&size=20", headers=headers)
    assert default_ingredients.status_code == 200
    assert default_ingredients.json()["items"] == []

    include_ingredients = await client.get("/api/v1/admin/ingredients?page=1&size=20&include_inactive=true", headers=headers)
    assert include_ingredients.status_code == 200
    assert [item["id"] for item in include_ingredients.json()["items"]] == [inactive_ingredient.json()["id"]]


@pytest.mark.asyncio
async def test_ingredient_routes_require_admin(client):
    anon = await client.get("/api/v1/admin/ingredients?page=1&size=20")
    assert anon.status_code == 401

    user = await client.post(
        "/api/v1/auth/register",
        json={"first_name": "No", "last_name": "Admin", "email": "ingredient-user@test.local", "password": "StrongPass123!"},
    )
    user_headers = {"Authorization": f"Bearer {user.json()['access_token']}"}
    forbidden = await client.get("/api/v1/admin/ingredients?page=1&size=20", headers=user_headers)
    assert forbidden.status_code == 403
