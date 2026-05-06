from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PageParams
from app.core.repository import BaseRepository
from app.modules.categories.model import Category


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Category)

    def _filtered_statement(
        self,
        *,
        include_inactive: bool,
        parent_id: int | None | object = ...,
    ) -> Select[tuple[Category]]:
        statement = select(Category).where(Category.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Category.is_active.is_(True))
        if parent_id is not ...:
            if parent_id is None:
                statement = statement.where(Category.parent_id.is_(None))
            else:
                statement = statement.where(Category.parent_id == parent_id)
        return statement.order_by(Category.sort_order.asc(), Category.name.asc(), Category.id.asc())

    async def list_paginated(
        self,
        page_params: PageParams,
        *,
        include_inactive: bool,
        parent_id: int | None | object = ...,
    ) -> list[Category]:
        statement = self._filtered_statement(include_inactive=include_inactive, parent_id=parent_id)
        result = await self.session.execute(statement.offset(page_params.offset).limit(page_params.size))
        return list(result.scalars().all())

    async def count_filtered(self, *, include_inactive: bool, parent_id: int | None | object = ...) -> int:
        statement = select(func.count()).select_from(Category).where(Category.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Category.is_active.is_(True))
        if parent_id is not ...:
            if parent_id is None:
                statement = statement.where(Category.parent_id.is_(None))
            else:
                statement = statement.where(Category.parent_id == parent_id)
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def list_for_tree(self, *, include_inactive: bool) -> list[Category]:
        result = await self.session.execute(self._filtered_statement(include_inactive=include_inactive))
        return list(result.scalars().all())

    async def get_active_parent(self, parent_id: int) -> Category | None:
        statement = select(Category).where(
            Category.id == parent_id,
            Category.deleted_at.is_(None),
            Category.is_active.is_(True),
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_active_sibling_by_slug(
        self,
        *,
        parent_id: int | None,
        slug: str,
        exclude_id: int | None = None,
    ) -> Category | None:
        parent_clause = Category.parent_id.is_(None) if parent_id is None else Category.parent_id == parent_id
        statement = select(Category).where(
            parent_clause,
            Category.slug == slug,
            Category.deleted_at.is_(None),
            Category.is_active.is_(True),
        )
        if exclude_id is not None:
            statement = statement.where(Category.id != exclude_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def has_active_children(self, category_id: int) -> bool:
        statement = select(Category.id).where(
            Category.parent_id == category_id,
            Category.deleted_at.is_(None),
            Category.is_active.is_(True),
        )
        result = await self.session.execute(statement.limit(1))
        return result.scalar_one_or_none() is not None

    async def list_hierarchy_records(self) -> list[Category]:
        statement = select(Category).where(Category.deleted_at.is_(None)).order_by(Category.id.asc())
        result = await self.session.execute(statement)
        return list(result.scalars().all())
