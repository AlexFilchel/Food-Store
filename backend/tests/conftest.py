import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
async def backend_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    from app.core.config import get_settings
    from app.core.database import get_engine, get_session_factory
    from app.modules.auth.rate_limiter import get_login_rate_limiter

    database_path = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{database_path}")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-with-at-least-32-characters")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@test.local")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin1234!")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_FIRST_NAME", "Admin")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_LAST_NAME", "User")
    monkeypatch.setenv("BOOTSTRAP_ADMIN_FULL_NAME", "Admin User")
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_login_rate_limiter.cache_clear()
    os.environ.pop("PYTHONDONTWRITEBYTECODE", None)

    yield

    if get_engine.cache_info().currsize:
        await get_engine().dispose()
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    get_login_rate_limiter.cache_clear()


@pytest.fixture
async def client():
    from app.main import create_app
    from app.core.database import get_metadata, get_session_factory, import_models
    from app.db.seed import seed_database

    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw["bind"]

    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)

    await seed_database()

    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client
