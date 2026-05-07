from __future__ import annotations

import re
import unicodedata

from app.core.pagination import PageParams, PaginatedResponse, make_paginated_response
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.ingredients.errors import (
    allergen_duplicate,
    allergen_in_use,
    allergen_not_found,
    ingredient_duplicate,
    ingredient_has_products,
    ingredient_invalid_allergen,
    ingredient_not_found,
)
from app.modules.ingredients.model import Allergen, Ingredient
from app.modules.ingredients.schemas import (
    AllergenCreateRequest,
    AllergenResponse,
    AllergenUpdateRequest,
    IngredientCreateRequest,
    IngredientResponse,
    IngredientUpdateRequest,
)

SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


class IngredientService:
    async def list_ingredients(
        self,
        uow: SqlAlchemyUnitOfWork,
        page_params: PageParams,
        *,
        include_inactive: bool,
        search: str | None,
        allergen_id: int | None,
    ) -> PaginatedResponse[IngredientResponse]:
        async with uow:
            items = await uow.ingredients.list_paginated(
                page_params,
                include_inactive=include_inactive,
                search=search,
                allergen_id=allergen_id,
            )
            total = await uow.ingredients.count_filtered(include_inactive=include_inactive, search=search, allergen_id=allergen_id)
            payload_items: list[IngredientResponse] = []
            for item in items:
                allergens = await uow.ingredient_allergens.list_allergens_for_ingredient(item.id)
                payload_items.append(IngredientResponse.from_model(item, allergens))
            return make_paginated_response(items=payload_items, total=total, page=page_params.page, size=page_params.size)

    async def get_ingredient_detail(self, uow: SqlAlchemyUnitOfWork, ingredient_id: int) -> IngredientResponse:
        async with uow:
            ingredient = await uow.ingredients.get_by_id(ingredient_id)
            if ingredient is None:
                raise ingredient_not_found()
            allergens = await uow.ingredient_allergens.list_allergens_for_ingredient(ingredient.id)
            return IngredientResponse.from_model(ingredient, allergens)

    async def create_ingredient(self, uow: SqlAlchemyUnitOfWork, payload: IngredientCreateRequest) -> IngredientResponse:
        async with uow:
            slug = self._slugify(payload.name)
            if payload.is_active and await uow.ingredients.get_active_by_slug(slug=slug):
                raise ingredient_duplicate()
            allergens = await self._validate_allergens(uow, payload.allergen_ids)
            ingredient = await uow.ingredients.create(
                Ingredient(name=payload.name, slug=slug, description=payload.description, is_active=payload.is_active),
            )
            await uow.ingredient_allergens.replace_allergens(ingredient.id, [allergen.id for allergen in allergens])
            return IngredientResponse.from_model(ingredient, allergens)

    async def update_ingredient(self, uow: SqlAlchemyUnitOfWork, ingredient_id: int, payload: IngredientUpdateRequest) -> IngredientResponse:
        async with uow:
            ingredient = await uow.ingredients.get_by_id(ingredient_id)
            if ingredient is None:
                raise ingredient_not_found()

            updates = payload.model_dump(exclude_unset=True)
            next_name = updates.get("name", ingredient.name)
            next_slug = self._slugify(next_name)
            next_is_active = updates.get("is_active", ingredient.is_active)
            if next_is_active and await uow.ingredients.get_active_by_slug(slug=next_slug, exclude_id=ingredient.id):
                raise ingredient_duplicate()

            updated = await uow.ingredients.update(
                ingredient,
                {
                    "name": next_name,
                    "slug": next_slug,
                    "description": updates.get("description", ingredient.description),
                    "is_active": next_is_active,
                },
            )

            if "allergen_ids" in updates:
                allergens = await self._validate_allergens(uow, updates["allergen_ids"] or [])
                await uow.ingredient_allergens.replace_allergens(updated.id, [allergen.id for allergen in allergens])
            else:
                allergens = await uow.ingredient_allergens.list_allergens_for_ingredient(updated.id)

            return IngredientResponse.from_model(updated, allergens)

    async def delete_ingredient(self, uow: SqlAlchemyUnitOfWork, ingredient_id: int) -> None:
        async with uow:
            ingredient = await uow.ingredients.get_by_id(ingredient_id)
            if ingredient is None:
                raise ingredient_not_found()
            if await uow.products.has_active_product_for_ingredient(ingredient.id):
                raise ingredient_has_products()
            await uow.ingredients.soft_delete(ingredient)

    async def list_allergens(
        self,
        uow: SqlAlchemyUnitOfWork,
        page_params: PageParams,
        *,
        include_inactive: bool,
        search: str | None,
    ) -> PaginatedResponse[AllergenResponse]:
        async with uow:
            items = await uow.allergens.list_paginated(page_params, include_inactive=include_inactive, search=search)
            total = await uow.allergens.count_filtered(include_inactive=include_inactive, search=search)
            return make_paginated_response(
                items=[AllergenResponse.from_model(item) for item in items],
                total=total,
                page=page_params.page,
                size=page_params.size,
            )

    async def get_allergen_detail(self, uow: SqlAlchemyUnitOfWork, allergen_id: int) -> AllergenResponse:
        async with uow:
            allergen = await uow.allergens.get_by_id(allergen_id)
            if allergen is None:
                raise allergen_not_found()
            return AllergenResponse.from_model(allergen)

    async def create_allergen(self, uow: SqlAlchemyUnitOfWork, payload: AllergenCreateRequest) -> AllergenResponse:
        async with uow:
            slug = self._slugify(payload.name)
            if payload.is_active and await uow.allergens.get_active_by_slug(slug=slug):
                raise allergen_duplicate()
            created = await uow.allergens.create(Allergen(name=payload.name, slug=slug, description=payload.description, is_active=payload.is_active))
            return AllergenResponse.from_model(created)

    async def update_allergen(self, uow: SqlAlchemyUnitOfWork, allergen_id: int, payload: AllergenUpdateRequest) -> AllergenResponse:
        async with uow:
            allergen = await uow.allergens.get_by_id(allergen_id)
            if allergen is None:
                raise allergen_not_found()
            updates = payload.model_dump(exclude_unset=True)
            next_name = updates.get("name", allergen.name)
            next_slug = self._slugify(next_name)
            next_is_active = updates.get("is_active", allergen.is_active)
            if next_is_active and await uow.allergens.get_active_by_slug(slug=next_slug, exclude_id=allergen.id):
                raise allergen_duplicate()
            updated = await uow.allergens.update(
                allergen,
                {
                    "name": next_name,
                    "slug": next_slug,
                    "description": updates.get("description", allergen.description),
                    "is_active": next_is_active,
                },
            )
            return AllergenResponse.from_model(updated)

    async def delete_allergen(self, uow: SqlAlchemyUnitOfWork, allergen_id: int) -> None:
        async with uow:
            allergen = await uow.allergens.get_by_id(allergen_id)
            if allergen is None:
                raise allergen_not_found()
            if await uow.allergens.has_active_ingredient_references(allergen_id):
                raise allergen_in_use()
            await uow.allergens.soft_delete(allergen)

    async def _validate_allergens(self, uow: SqlAlchemyUnitOfWork, allergen_ids: list[int]) -> list[Allergen]:
        unique_ids = sorted(set(allergen_ids))
        allergens = await uow.allergens.get_valid_by_ids(unique_ids)
        if len(allergens) != len(unique_ids):
            raise ingredient_invalid_allergen()
        return allergens

    def _slugify(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        slug = SLUG_INVALID_CHARS.sub("-", normalized.strip().lower()).strip("-")
        if not slug:
            raise ingredient_duplicate()
        return slug[:140]


ingredient_service = IngredientService()
