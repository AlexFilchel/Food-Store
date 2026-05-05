from functools import lru_cache

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.core.config import get_settings


def import_models() -> None:
    from app.modules.identity import model as _identity_models  # noqa: F401
    from app.modules.orders import model as _order_models  # noqa: F401
    from app.modules.payments import model as _payment_models  # noqa: F401


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(settings.database_url, future=True, echo=False)


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncSession:
    async with get_session_factory()() as session:
        yield session


def get_metadata() -> MetaData:
    import_models()
    return SQLModel.metadata
