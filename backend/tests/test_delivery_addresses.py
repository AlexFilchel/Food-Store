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


def make_payload(**overrides):
    payload = {
        "recipient_name": "Ada Lovelace",
        "phone": "+5491112345678",
        "street": "Av Siempre Viva",
        "street_number": "742",
        "floor": "",
        "apartment": "",
        "city": "CABA",
        "province": "Buenos Aires",
        "postal_code": "1000",
        "reference": "Puerta negra",
        "is_default": False,
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_create_and_list_owned_addresses(client):
    owner = await register_user(client, email="address-owner@example.com")
    token = owner.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload())
    assert create_response.status_code == 201

    list_response = await client.get("/api/v1/customer/addresses", headers=headers)
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["id"] == create_response.json()["id"]
    assert items[0]["is_default"] is True


@pytest.mark.asyncio
async def test_customer_views_own_address_detail(client):
    owner = await register_user(client, email="address-detail@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
    create_response = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload(street_number="321"))
    address_id = create_response.json()["id"]

    detail_response = await client.get(f"/api/v1/customer/addresses/{address_id}", headers=headers)

    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["id"] == address_id
    assert payload["recipient_name"] == "Ada Lovelace"
    assert payload["street"] == "Av Siempre Viva"
    assert payload["street_number"] == "321"
    assert payload["is_default"] is True


@pytest.mark.asyncio
async def test_anonymous_requests_return_401(client):
    response = await client.get("/api/v1/customer/addresses")
    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_INVALID_TOKEN"


@pytest.mark.asyncio
async def test_client_user_id_is_ignored_for_ownership(client):
    owner = await register_user(client, email="owner-id@example.com")
    other = await register_user(client, email="other-id@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/customer/addresses",
        headers=headers,
        json=make_payload(user_id=other.json()["user"]["id"]),
    )
    created_id = create_response.json()["id"]

    update_response = await client.patch(
        f"/api/v1/customer/addresses/{created_id}",
        headers=headers,
        json={"user_id": other.json()["user"]["id"], "city": "Rosario"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["city"] == "Rosario"

    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    other_detail = await client.get(f"/api/v1/customer/addresses/{created_id}", headers=other_headers)
    assert other_detail.status_code == 404


@pytest.mark.asyncio
async def test_list_excludes_foreign_addresses_and_uses_stable_order(client):
    owner = await register_user(client, email="owner-list@example.com")
    other = await register_user(client, email="other-list@example.com")
    owner_headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    first = await client.post("/api/v1/customer/addresses", headers=owner_headers, json=make_payload(street_number="1"))
    second = await client.post("/api/v1/customer/addresses", headers=owner_headers, json=make_payload(street_number="2", is_default=True))
    await client.post("/api/v1/customer/addresses", headers=other_headers, json=make_payload(street_number="999"))

    list_response = await client.get("/api/v1/customer/addresses", headers=owner_headers)

    assert list_response.status_code == 200
    items = list_response.json()
    assert [item["id"] for item in items] == [second.json()["id"], first.json()["id"]]
    assert {item["street_number"] for item in items} == {"1", "2"}


@pytest.mark.asyncio
async def test_foreign_address_access_is_hidden_as_not_found(client):
    owner = await register_user(client, email="owner-foreign@example.com")
    other = await register_user(client, email="other-foreign@example.com")
    owner_headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    create_response = await client.post("/api/v1/customer/addresses", headers=owner_headers, json=make_payload())
    address_id = create_response.json()["id"]

    missing_response = await client.get("/api/v1/customer/addresses/999999", headers=owner_headers)
    assert missing_response.status_code == 404
    assert missing_response.json()["code"] == "DELIVERY_ADDRESS_NOT_FOUND"

    for method in ("get", "patch", "delete"):
        if method == "get":
            response = await client.get(f"/api/v1/customer/addresses/{address_id}", headers=other_headers)
        elif method == "patch":
            response = await client.patch(
                f"/api/v1/customer/addresses/{address_id}",
                headers=other_headers,
                json={"city": "Rosario"},
            )
        else:
            response = await client.delete(f"/api/v1/customer/addresses/{address_id}", headers=other_headers)

        assert response.status_code == 404
        assert response.json()["code"] == "DELIVERY_ADDRESS_NOT_FOUND"


@pytest.mark.asyncio
async def test_update_changes_only_current_user_address(client):
    owner = await register_user(client, email="owner-update@example.com")
    other = await register_user(client, email="other-update@example.com")
    owner_headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    create_response = await client.post("/api/v1/customer/addresses", headers=owner_headers, json=make_payload())
    address_id = create_response.json()["id"]

    update_response = await client.patch(
        f"/api/v1/customer/addresses/{address_id}",
        headers=owner_headers,
        json={"city": "Rosario"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["city"] == "Rosario"

    foreign_view = await client.get(f"/api/v1/customer/addresses/{address_id}", headers=other_headers)
    assert foreign_view.status_code == 404


@pytest.mark.asyncio
async def test_soft_deleted_address_is_excluded_everywhere(client):
    owner = await register_user(client, email="owner-delete@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    created = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload())
    address_id = created.json()["id"]

    delete_response = await client.delete(f"/api/v1/customer/addresses/{address_id}", headers=headers)
    assert delete_response.status_code == 204

    list_response = await client.get("/api/v1/customer/addresses", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json() == []

    detail_response = await client.get(f"/api/v1/customer/addresses/{address_id}", headers=headers)
    assert detail_response.status_code == 404

    patch_response = await client.patch(f"/api/v1/customer/addresses/{address_id}", headers=headers, json={"city": "X"})
    assert patch_response.status_code == 404

    second_delete = await client.delete(f"/api/v1/customer/addresses/{address_id}", headers=headers)
    assert second_delete.status_code == 404


@pytest.mark.asyncio
async def test_first_address_becomes_default(client):
    owner = await register_user(client, email="owner-default-first@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    created = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload())
    assert created.status_code == 201
    assert created.json()["is_default"] is True


@pytest.mark.asyncio
async def test_new_or_marked_default_unsets_previous_default(client):
    owner = await register_user(client, email="owner-default-switch@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    first = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload(street_number="1"))
    second = await client.post(
        "/api/v1/customer/addresses",
        headers=headers,
        json=make_payload(street_number="2", is_default=True),
    )
    assert second.json()["is_default"] is True

    list_response = await client.get("/api/v1/customer/addresses", headers=headers)
    defaults_after_create = [item for item in list_response.json() if item["is_default"]]
    assert len(defaults_after_create) == 1

    mark_first = await client.put(
        f"/api/v1/customer/addresses/{first.json()['id']}/default",
        headers=headers,
        json={"is_default": True},
    )
    assert mark_first.status_code == 200

    list_again = await client.get("/api/v1/customer/addresses", headers=headers)
    defaults_after_mark = [item for item in list_again.json() if item["is_default"]]
    assert len(defaults_after_mark) == 1
    assert defaults_after_mark[0]["id"] == first.json()["id"]


@pytest.mark.asyncio
async def test_delete_default_selects_valid_replacement(client):
    owner = await register_user(client, email="owner-default-delete@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    first = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload(street_number="1"))
    second = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload(street_number="2"))

    await client.put(f"/api/v1/customer/addresses/{second.json()['id']}/default", headers=headers, json={"is_default": True})
    delete_default = await client.delete(f"/api/v1/customer/addresses/{second.json()['id']}", headers=headers)
    assert delete_default.status_code == 204

    list_response = await client.get("/api/v1/customer/addresses", headers=headers)
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["id"] == first.json()["id"]
    assert items[0]["is_default"] is True


@pytest.mark.asyncio
async def test_optional_blank_fields_are_normalized(client):
    owner = await register_user(client, email="owner-normalized@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/customer/addresses",
        headers=headers,
        json=make_payload(floor="   ", apartment="", reference="   "),
    )

    assert create_response.status_code == 201
    payload = create_response.json()
    assert payload["floor"] is None
    assert payload["apartment"] is None
    assert payload["reference"] is None


@pytest.mark.asyncio
async def test_invalid_payload_returns_validation_error_contract(client):
    owner = await register_user(client, email="owner-invalid@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    response = await client.post(
        "/api/v1/customer/addresses",
        headers=headers,
        json=make_payload(recipient_name="", phone="", street="", street_number="", city="", province="", postal_code=""),
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["title"] == "Validation Error"


@pytest.mark.asyncio
async def test_address_response_excludes_owner_security_internals(client):
    owner = await register_user(client, email="owner-safe@example.com")
    headers = {"Authorization": f"Bearer {owner.json()['access_token']}"}

    created = await client.post("/api/v1/customer/addresses", headers=headers, json=make_payload())
    payload = created.json()

    assert created.status_code == 201
    assert "user_id" not in payload
    assert "hashed_password" not in payload
    assert "token_hash" not in payload
    assert "security_context" not in payload
