from sqlalchemy import Select, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PageParams
from app.core.repository import BaseRepository
from app.modules.ingredients.model import Allergen, Ingredient, IngredientAllergen


class IngredientRepository(BaseRepository[Ingredient]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Ingredient)

    def _filtered_statement(self, *, include_inactive: bool, search: str | None, allergen_id: int | None = None) -> Select[tuple[Ingredient]]:
        statement = select(Ingredient).where(Ingredient.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Ingredient.is_active.is_(True))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(or_(func.lower(Ingredient.name).like(term), func.lower(Ingredient.slug).like(term)))
        if allergen_id is not None:
            statement = statement.where(
                exists(select(1).where(IngredientAllergen.ingredient_id == Ingredient.id, IngredientAllergen.allergen_id == allergen_id))
            )
        return statement.order_by(Ingredient.name.asc(), Ingredient.id.asc())

    async def list_paginated(self, page_params: PageParams, *, include_inactive: bool, search: str | None, allergen_id: int | None = None) -> list[Ingredient]:
        result = await self.session.execute(
            self._filtered_statement(include_inactive=include_inactive, search=search, allergen_id=allergen_id)
            .offset(page_params.offset)
            .limit(page_params.size)
        )
        return list(result.scalars().all())

    async def count_filtered(self, *, include_inactive: bool, search: str | None, allergen_id: int | None = None) -> int:
        statement = select(func.count()).select_from(Ingredient).where(Ingredient.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Ingredient.is_active.is_(True))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(or_(func.lower(Ingredient.name).like(term), func.lower(Ingredient.slug).like(term)))
        if allergen_id is not None:
            statement = statement.where(
                exists(select(1).where(IngredientAllergen.ingredient_id == Ingredient.id, IngredientAllergen.allergen_id == allergen_id))
            )
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def get_active_by_slug(self, *, slug: str, exclude_id: int | None = None) -> Ingredient | None:
        statement = select(Ingredient).where(Ingredient.slug == slug, Ingredient.deleted_at.is_(None), Ingredient.is_active.is_(True))
        if exclude_id is not None:
            statement = statement.where(Ingredient.id != exclude_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()


class AllergenRepository(BaseRepository[Allergen]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Allergen)

    async def list_paginated(self, page_params: PageParams, *, include_inactive: bool, search: str | None) -> list[Allergen]:
        statement = select(Allergen).where(Allergen.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Allergen.is_active.is_(True))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(or_(func.lower(Allergen.name).like(term), func.lower(Allergen.slug).like(term)))
        result = await self.session.execute(statement.order_by(Allergen.name.asc(), Allergen.id.asc()).offset(page_params.offset).limit(page_params.size))
        return list(result.scalars().all())

    async def count_filtered(self, *, include_inactive: bool, search: str | None) -> int:
        statement = select(func.count()).select_from(Allergen).where(Allergen.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Allergen.is_active.is_(True))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(or_(func.lower(Allergen.name).like(term), func.lower(Allergen.slug).like(term)))
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def get_active_by_slug(self, *, slug: str, exclude_id: int | None = None) -> Allergen | None:
        statement = select(Allergen).where(Allergen.slug == slug, Allergen.deleted_at.is_(None), Allergen.is_active.is_(True))
        if exclude_id is not None:
            statement = statement.where(Allergen.id != exclude_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_valid_by_ids(self, allergen_ids: list[int]) -> list[Allergen]:
        if not allergen_ids:
            return []
        statement = select(Allergen).where(Allergen.id.in_(allergen_ids), Allergen.deleted_at.is_(None), Allergen.is_active.is_(True))
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def has_active_ingredient_references(self, allergen_id: int) -> bool:
        statement = select(IngredientAllergen.ingredient_id).join(Ingredient, Ingredient.id == IngredientAllergen.ingredient_id).where(
            IngredientAllergen.allergen_id == allergen_id,
            Ingredient.deleted_at.is_(None),
            Ingredient.is_active.is_(True),
        )
        result = await self.session.execute(statement.limit(1))
        return result.scalar_one_or_none() is not None


class IngredientAllergenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_allergens_for_ingredient(self, ingredient_id: int) -> list[Allergen]:
        statement = (
            select(Allergen)
            .join(IngredientAllergen, IngredientAllergen.allergen_id == Allergen.id)
            .where(IngredientAllergen.ingredient_id == ingredient_id, Allergen.deleted_at.is_(None))
            .order_by(Allergen.name.asc(), Allergen.id.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def replace_allergens(self, ingredient_id: int, allergen_ids: list[int]) -> None:
        await self.session.execute(IngredientAllergen.__table__.delete().where(IngredientAllergen.ingredient_id == ingredient_id))
        for allergen_id in allergen_ids:
            self.session.add(IngredientAllergen(ingredient_id=ingredient_id, allergen_id=allergen_id))
        await self.session.flush()
