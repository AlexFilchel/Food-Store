from __future__ import annotations

import re
import unicodedata

from app.core.pagination import PageParams, PaginatedResponse, make_paginated_response
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.categories.errors import (
    category_cycle_detected,
    category_duplicate,
    category_has_children,
    category_invalid_parent,
    category_not_found,
)
from app.modules.categories.model import Category
from app.modules.categories.schemas import (
    CategoryCreateRequest,
    CategoryPersistenceRecord,
    CategoryResponse,
    CategoryTreeResponse,
    sort_tree_nodes,
)

SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


class CategoryService:
    async def list_categories(
        self,
        uow: SqlAlchemyUnitOfWork,
        page_params: PageParams,
        *,
        include_inactive: bool,
        parent_id: int | None | object = ...,
    ) -> PaginatedResponse[CategoryResponse]:
        async with uow:
            items = await uow.categories.list_paginated(
                page_params,
                include_inactive=include_inactive,
                parent_id=parent_id,
            )
            total = await uow.categories.count_filtered(include_inactive=include_inactive, parent_id=parent_id)
            return make_paginated_response(
                items=[CategoryResponse.from_model(item) for item in items],
                total=total,
                page=page_params.page,
                size=page_params.size,
            )

    async def get_tree(self, uow: SqlAlchemyUnitOfWork, *, include_inactive: bool) -> list[CategoryTreeResponse]:
        async with uow:
            categories = await uow.categories.list_for_tree(include_inactive=include_inactive)
            return self._build_tree(categories)

    async def get_detail(self, uow: SqlAlchemyUnitOfWork, category_id: int) -> CategoryResponse:
        async with uow:
            category = await self._get_category_or_fail(uow, category_id)
            return CategoryResponse.from_model(category)

    async def create_category(self, uow: SqlAlchemyUnitOfWork, payload: CategoryCreateRequest) -> CategoryResponse:
        async with uow:
            record = CategoryPersistenceRecord(
                name=payload.name,
                slug=self._slugify(payload.name),
                description=payload.description,
                parent_id=payload.parent_id,
                sort_order=payload.sort_order,
                is_active=payload.is_active,
            )
            await self._validate_parent_assignment(uow, category_id=None, parent_id=record.parent_id)
            await self._ensure_unique_active_sibling(uow, parent_id=record.parent_id, slug=record.slug, is_active=record.is_active)
            category = await uow.categories.create(Category(**record.model_dump()))
            return CategoryResponse.from_model(category)

    async def update_category(self, uow: SqlAlchemyUnitOfWork, category_id: int, payload) -> CategoryResponse:
        async with uow:
            category = await self._get_category_or_fail(uow, category_id)
            updates = payload.model_dump(exclude_unset=True)

            next_name = updates.get("name", category.name)
            next_parent_id = updates.get("parent_id", category.parent_id)
            next_sort_order = updates.get("sort_order", category.sort_order)
            next_is_active = updates.get("is_active", category.is_active)
            next_description = updates.get("description", category.description)
            next_slug = self._slugify(next_name)

            await self._validate_parent_assignment(uow, category_id=category.id, parent_id=next_parent_id)
            await self._ensure_unique_active_sibling(
                uow,
                parent_id=next_parent_id,
                slug=next_slug,
                is_active=next_is_active,
                exclude_id=category.id,
            )

            updated = await uow.categories.update(
                category,
                {
                    "name": next_name,
                    "slug": next_slug,
                    "description": next_description,
                    "parent_id": next_parent_id,
                    "sort_order": next_sort_order,
                    "is_active": next_is_active,
                },
            )
            return CategoryResponse.from_model(updated)

    async def delete_category(self, uow: SqlAlchemyUnitOfWork, category_id: int) -> None:
        async with uow:
            category = await self._get_category_or_fail(uow, category_id)
            if await uow.categories.has_active_children(category.id):
                raise category_has_children()
            await uow.categories.soft_delete(category)

    async def _get_category_or_fail(self, uow: SqlAlchemyUnitOfWork, category_id: int) -> Category:
        category = await uow.categories.get_by_id(category_id)
        if category is None:
            raise category_not_found()
        return category

    async def _validate_parent_assignment(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        category_id: int | None,
        parent_id: int | None,
    ) -> None:
        if parent_id is None:
            return
        if category_id is not None and parent_id == category_id:
            raise category_cycle_detected()

        parent = await uow.categories.get_active_parent(parent_id)
        if parent is None:
            raise category_invalid_parent()

        if category_id is not None:
            await self._ensure_no_cycle(uow, category_id=category_id, parent_id=parent_id)

    async def _ensure_unique_active_sibling(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        parent_id: int | None,
        slug: str,
        is_active: bool,
        exclude_id: int | None = None,
    ) -> None:
        if not is_active:
            return
        duplicate = await uow.categories.get_active_sibling_by_slug(parent_id=parent_id, slug=slug, exclude_id=exclude_id)
        if duplicate is not None:
            raise category_duplicate()

    async def _ensure_no_cycle(self, uow: SqlAlchemyUnitOfWork, *, category_id: int, parent_id: int) -> None:
        categories = await uow.categories.list_hierarchy_records()
        parent_map = {category.id: category.parent_id for category in categories if category.id is not None}
        visited: set[int] = set()
        current_parent_id: int | None = parent_id

        while current_parent_id is not None:
            if current_parent_id == category_id:
                raise category_cycle_detected()
            if current_parent_id in visited:
                raise category_cycle_detected()
            visited.add(current_parent_id)
            current_parent_id = parent_map.get(current_parent_id)

    def _build_tree(self, categories: list[Category]) -> list[CategoryTreeResponse]:
        children_by_parent: dict[int | None, list[Category]] = {}
        for category in categories:
            children_by_parent.setdefault(category.parent_id, []).append(category)

        def build_node(category: Category) -> CategoryTreeResponse:
            raw_children = children_by_parent.get(category.id, [])
            built_children = sort_tree_nodes([build_node(child) for child in raw_children])
            return CategoryTreeResponse.from_model(category, built_children)

        roots = children_by_parent.get(None, [])
        return sort_tree_nodes([build_node(root) for root in roots])

    def _slugify(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        slug = SLUG_INVALID_CHARS.sub("-", normalized.strip().lower()).strip("-")
        if not slug:
            raise category_duplicate()
        return slug[:140]


category_service = CategoryService()
