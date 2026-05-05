import pytest


@pytest.mark.asyncio
async def test_healthcheck_returns_ok(client):
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "food-store-backend"
    assert payload["timestamp"].endswith("Z")
