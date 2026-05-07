from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PageParams
from app.core.repository import BaseRepository
from app.modules.categories.model import Category
from app.modules.ingredients.model import Ingredient
from app.modules.products.model import Product, ProductCategory, ProductIngredient


class ProductRepository(BaseRepository[Product]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Product)

    def _filtered_statement(
        self,
        *,
        include_inactive: bool,
        search: str | None,
        category_id: int | None,
        ingredient_id: int | None,
        availability: bool | None,
        stock_state: str | None,
    ) -> Select[tuple[Product]]:
        statement = select(Product).where(Product.deleted_at.is_(None))
        if not include_inactive:
            statement = statement.where(Product.is_active.is_(True))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(or_(func.lower(Product.name).like(term), func.lower(Product.slug).like(term)))
        if category_id is not None:
            statement = statement.where(exists(select(1).where(ProductCategory.product_id == Product.id, ProductCategory.category_id == category_id)))
        if ingredient_id is not None:
            statement = statement.where(exists(select(1).where(ProductIngredient.product_id == Product.id, ProductIngredient.ingredient_id == ingredient_id)))
        if availability is not None:
            statement = statement.where(Product.is_available.is_(availability))
        if stock_state == "in_stock":
            statement = statement.where(Product.stock_quantity > 0)
        if stock_state == "out_of_stock":
            statement = statement.where(Product.stock_quantity == 0)
        return statement.order_by(Product.updated_at.desc(), Product.id.desc())

    async def list_paginated(self, page_params: PageParams, **filters) -> list[Product]:
        result = await self.session.execute(self._filtered_statement(**filters).offset(page_params.offset).limit(page_params.size))
        return list(result.scalars().all())

    async def count_filtered(self, **filters) -> int:
        result = await self.session.execute(select(func.count()).select_from(self._filtered_statement(**filters).subquery()))
        return int(result.scalar_one())

    async def get_active_by_slug(self, slug: str, *, exclude_id: int | None = None) -> Product | None:
        statement = select(Product).where(Product.slug == slug, Product.deleted_at.is_(None), Product.is_active.is_(True))
        if exclude_id is not None:
            statement = statement.where(Product.id != exclude_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_categories_for_product(self, product_id: int) -> list[Category]:
        result = await self.session.execute(
            select(Category)
            .join(ProductCategory, ProductCategory.category_id == Category.id)
            .where(ProductCategory.product_id == product_id, Category.deleted_at.is_(None))
            .order_by(Category.name.asc(), Category.id.asc())
        )
        return list(result.scalars().all())

    async def list_ingredients_for_product(self, product_id: int) -> list[tuple[Ingredient, bool]]:
        result = await self.session.execute(
            select(Ingredient, ProductIngredient.is_removable)
            .join(ProductIngredient, ProductIngredient.ingredient_id == Ingredient.id)
            .where(ProductIngredient.product_id == product_id, Ingredient.deleted_at.is_(None))
            .order_by(Ingredient.name.asc(), Ingredient.id.asc())
        )
        return [(row[0], bool(row[1])) for row in result.all()]

    async def replace_categories(self, product_id: int, category_ids: list[int]) -> None:
        await self.session.execute(ProductCategory.__table__.delete().where(ProductCategory.product_id == product_id))
        for category_id in sorted(set(category_ids)):
            self.session.add(ProductCategory(product_id=product_id, category_id=category_id))
        await self.session.flush()

    async def replace_ingredients(self, product_id: int, ingredients: list[tuple[int, bool]]) -> None:
        await self.session.execute(ProductIngredient.__table__.delete().where(ProductIngredient.product_id == product_id))
        unique: dict[int, bool] = {}
        for ingredient_id, is_removable in ingredients:
            unique[ingredient_id] = is_removable
        for ingredient_id, is_removable in sorted(unique.items()):
            self.session.add(ProductIngredient(product_id=product_id, ingredient_id=ingredient_id, is_removable=is_removable))
        await self.session.flush()

    async def has_active_product_for_category(self, category_id: int) -> bool:
        result = await self.session.execute(
            select(ProductCategory.product_id)
            .join(Product, Product.id == ProductCategory.product_id)
            .where(ProductCategory.category_id == category_id, Product.deleted_at.is_(None), Product.is_active.is_(True))
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def has_active_product_for_ingredient(self, ingredient_id: int) -> bool:
        result = await self.session.execute(
            select(ProductIngredient.product_id)
            .join(Product, Product.id == ProductIngredient.product_id)
            .where(ProductIngredient.ingredient_id == ingredient_id, Product.deleted_at.is_(None), Product.is_active.is_(True))
            .limit(1)
        )
        return result.scalar_one_or_none() is not None
