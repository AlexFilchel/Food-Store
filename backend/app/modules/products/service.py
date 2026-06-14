from __future__ import annotations

import re
import unicodedata
from decimal import Decimal

from sqlalchemy import select

from app.core.pagination import PageParams, PaginatedResponse, make_paginated_response
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.categories.model import Category
from app.modules.ingredients.model import Ingredient
from app.modules.products.errors import (
    product_duplicate,
    product_invalid_category,
    product_invalid_ingredient,
    product_invalid_price,
    product_invalid_stock,
    product_not_found,
)
from app.modules.products.model import Product
from app.modules.products.schemas import ProductCreateRequest, ProductResponse, ProductUpdateRequest, PublicProductResponse

SLUG_INVALID_CHARS = re.compile(r"[^a-z0-9]+")


class ProductService:
    async def list_products(self, uow: SqlAlchemyUnitOfWork, page_params: PageParams, **filters) -> PaginatedResponse[ProductResponse]:
        async with uow:
            products = await uow.products.list_paginated(page_params, **filters)
            total = await uow.products.count_filtered(**filters)
            items = [await self._to_response(uow, product) for product in products]
            return make_paginated_response(items=items, total=total, page=page_params.page, size=page_params.size)

    async def get_detail(self, uow: SqlAlchemyUnitOfWork, product_id: int) -> ProductResponse:
        async with uow:
            return await self._to_response(uow, await self._get_product_or_fail(uow, product_id))

    async def list_public_products(
        self,
        uow: SqlAlchemyUnitOfWork,
        page_params: PageParams,
        *,
        search: str | None,
        category_id: int | None,
    ) -> PaginatedResponse[PublicProductResponse]:
        async with uow:
            products = await uow.products.list_public_sellable_paginated(page_params, search=search, category_id=category_id)
            total = await uow.products.count_public_sellable(search=search, category_id=category_id)
            items = [await self._to_public_response(uow, product) for product in products]
            return make_paginated_response(items=items, total=total, page=page_params.page, size=page_params.size)

    async def get_public_detail(self, uow: SqlAlchemyUnitOfWork, product_id_or_slug: str) -> PublicProductResponse:
        async with uow:
            product = await uow.products.get_public_sellable_by_id_or_slug(product_id_or_slug)
            if product is None:
                raise product_not_found()
            return await self._to_public_response(uow, product)

    async def create_product(self, uow: SqlAlchemyUnitOfWork, payload: ProductCreateRequest) -> ProductResponse:
        async with uow:
            slug = self._slugify(payload.name)
            self._validate_price_stock(payload.price, payload.stock_quantity)
            if payload.is_active and await uow.products.get_active_by_slug(slug):
                raise product_duplicate()
            await self._validate_categories(uow, payload.category_ids)
            await self._validate_ingredients(uow, payload.ingredients)
            product = await uow.products.create(
                Product(
                    name=payload.name.strip(),
                    slug=slug,
                    description=payload.description.strip() if payload.description else None,
                    price=payload.price,
                    stock_quantity=payload.stock_quantity,
                    is_active=payload.is_active,
                    is_available=payload.is_available,
                    image_url=payload.image_url,
                ),
            )
            await uow.products.replace_categories(product.id, payload.category_ids)
            await uow.products.replace_ingredients(product.id, [(entry.ingredient_id, entry.is_removable) for entry in payload.ingredients])
            return await self._to_response(uow, product)

    async def update_product(self, uow: SqlAlchemyUnitOfWork, product_id: int, payload: ProductUpdateRequest) -> ProductResponse:
        async with uow:
            product = await self._get_product_or_fail(uow, product_id)
            updates = payload.model_dump(exclude_unset=True)
            next_name = updates.get("name", product.name)
            next_slug = self._slugify(next_name)
            next_price = updates.get("price", product.price)
            next_stock = updates.get("stock_quantity", product.stock_quantity)
            next_active = updates.get("is_active", product.is_active)
            self._validate_price_stock(next_price, next_stock)
            if next_active and await uow.products.get_active_by_slug(next_slug, exclude_id=product.id):
                raise product_duplicate()
            if "category_ids" in updates:
                await self._validate_categories(uow, updates["category_ids"] or [])
            if "ingredients" in updates:
                await self._validate_ingredients(uow, payload.ingredients or [])
            updated = await uow.products.update(
                product,
                {
                    "name": next_name.strip(),
                    "slug": next_slug,
                    "description": updates.get("description", product.description).strip() if updates.get("description", product.description) else None,
                    "price": next_price,
                    "stock_quantity": next_stock,
                    "is_active": next_active,
                    "is_available": updates.get("is_available", product.is_available),
                    "image_url": updates.get("image_url", product.image_url),
                },
            )
            if "category_ids" in updates:
                await uow.products.replace_categories(updated.id, updates["category_ids"] or [])
            if "ingredients" in updates:
                await uow.products.replace_ingredients(updated.id, [(entry.ingredient_id, entry.is_removable) for entry in (payload.ingredients or [])])
            return await self._to_response(uow, updated)

    async def delete_product(self, uow: SqlAlchemyUnitOfWork, product_id: int) -> None:
        async with uow:
            await uow.products.soft_delete(await self._get_product_or_fail(uow, product_id))

    async def _get_product_or_fail(self, uow: SqlAlchemyUnitOfWork, product_id: int) -> Product:
        product = await uow.products.get_by_id(product_id)
        if product is None:
            raise product_not_found()
        return product

    async def _to_response(self, uow: SqlAlchemyUnitOfWork, product: Product) -> ProductResponse:
        categories = await uow.products.list_categories_for_product(product.id)
        ingredients = await uow.products.list_ingredients_for_product(product.id)
        return ProductResponse.from_model(product, categories=categories, ingredients=ingredients)

    async def _to_public_response(self, uow: SqlAlchemyUnitOfWork, product: Product) -> PublicProductResponse:
        categories = await uow.products.list_categories_for_product(product.id)
        ingredients = await uow.products.list_ingredients_for_product(product.id)
        return PublicProductResponse.from_model(product, categories=categories, ingredients=ingredients)

    async def _validate_categories(self, uow: SqlAlchemyUnitOfWork, category_ids: list[int]) -> None:
        ids = sorted(set(category_ids))
        if not ids:
            return
        result = await uow.session.execute(select(Category.id).where(Category.id.in_(ids), Category.deleted_at.is_(None), Category.is_active.is_(True)))
        if len(list(result.scalars().all())) != len(ids):
            raise product_invalid_category()

    async def _validate_ingredients(self, uow: SqlAlchemyUnitOfWork, ingredients: list) -> None:
        ids = sorted({entry.ingredient_id for entry in ingredients})
        if not ids:
            return
        result = await uow.session.execute(select(Ingredient.id).where(Ingredient.id.in_(ids), Ingredient.deleted_at.is_(None), Ingredient.is_active.is_(True)))
        if len(list(result.scalars().all())) != len(ids):
            raise product_invalid_ingredient()

    def _validate_price_stock(self, price: Decimal, stock_quantity: int) -> None:
        if price < 0:
            raise product_invalid_price()
        if stock_quantity < 0:
            raise product_invalid_stock()

    def _slugify(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        slug = SLUG_INVALID_CHARS.sub("-", normalized.strip().lower()).strip("-")
        if not slug:
            raise product_duplicate()
        return slug[:180]


product_service = ProductService()
