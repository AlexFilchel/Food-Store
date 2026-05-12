import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.mark.asyncio
async def test_cors_origins_list_normalizes_trailing_slash(monkeypatch: pytest.MonkeyPatch):
    from app.core.config import get_settings

    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./test-cors.db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-characters")
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173/"]')
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.cors_origins_list == ["http://localhost:5173"]

    get_settings.cache_clear()


def test_options_preflight_allows_normalized_origin(monkeypatch: pytest.MonkeyPatch):
    from app.core.config import get_settings

    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./test-cors.db")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-characters")
    monkeypatch.setenv("CORS_ORIGINS", '["http://localhost:5173/"]')
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.options(
        "/api/v1/catalog/products?page=1&size=12",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"

    get_settings.cache_clear()
