from collections.abc import Mapping
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.core.pagination import PageParams
from app.core.time import utc_now

ModelT = TypeVar("ModelT", bound=SQLModel)


class BaseRepository(Generic[ModelT]):
    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    def _base_statement(self, include_deleted: bool = False):
        statement = select(self.model)
        if not include_deleted and hasattr(self.model, "deleted_at"):
            statement = statement.where(getattr(self.model, "deleted_at").is_(None))
        return statement

    async def get_by_id(self, entity_id: Any, *, include_deleted: bool = False) -> ModelT | None:
        statement = self._base_statement(include_deleted=include_deleted).where(getattr(self.model, "id") == entity_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_all(self, page_params: PageParams, *, include_deleted: bool = False) -> list[ModelT]:
        statement = self._base_statement(include_deleted=include_deleted).offset(page_params.offset).limit(page_params.size)
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def count(self, *, include_deleted: bool = False) -> int:
        statement = select(func.count()).select_from(self.model)
        if not include_deleted and hasattr(self.model, "deleted_at"):
            statement = statement.where(getattr(self.model, "deleted_at").is_(None))
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def create(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity: ModelT, updates: Mapping[str, Any]) -> ModelT:
        for key, value in updates.items():
            setattr(entity, key, value)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def soft_delete(self, entity: ModelT) -> None:
        if not hasattr(entity, "deleted_at"):
            raise TypeError(f"{self.model.__name__} does not support soft delete")
        entity.deleted_at = utc_now()
        await self.session.flush()

    async def hard_delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.flush()
