import pytest


@pytest.mark.asyncio
async def test_validation_errors_follow_problem_details_contract(client):
    response = await client.get("/api/v1/contracts/pagination-example?page=0&size=10")

    assert response.status_code == 422
    payload = response.json()
    assert payload["type"].endswith("/validation-error")
    assert payload["title"] == "Validation Error"
    assert payload["status"] == 422
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["timestamp"].endswith("Z")
    assert payload["instance"] == "/api/v1/contracts/pagination-example"
    assert payload["errors"][0]["field"] == "page"
