from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.time import to_utc_iso
from app.modules.categories.model import Category
from app.modules.ingredients.model import Ingredient
from app.modules.products.model import Product


class ProductIngredientCompositionRequest(BaseModel):
    ingredient_id: int
    is_removable: bool = True


class ProductCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal
    stock_quantity: int = Field(default=0, ge=0)
    is_active: bool = True
    is_available: bool = True
    category_ids: list[int] = Field(default_factory=list)
    ingredients: list[ProductIngredientCompositionRequest] = Field(default_factory=list)


class ProductUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_available: bool | None = None
    category_ids: list[int] | None = None
    ingredients: list[ProductIngredientCompositionRequest] | None = None


class ProductCategoryPayload(BaseModel):
    id: int
    name: str
    slug: str

    @classmethod
    def from_model(cls, category: Category) -> "ProductCategoryPayload":
        return cls(id=category.id, name=category.name, slug=category.slug)


class ProductIngredientPayload(BaseModel):
    ingredient_id: int
    name: str
    slug: str
    is_removable: bool


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    price: str
    stock_quantity: int
    is_active: bool
    is_available: bool
    created_at: str
    updated_at: str
    categories: list[ProductCategoryPayload]
    ingredients: list[ProductIngredientPayload]

    @classmethod
    def from_model(
        cls,
        product: Product,
        *,
        categories: list[Category],
        ingredients: list[tuple[Ingredient, bool]],
    ) -> "ProductResponse":
        return cls(
            id=product.id,
            name=product.name,
            slug=product.slug,
            description=product.description,
            price=f"{product.price:.2f}",
            stock_quantity=product.stock_quantity,
            is_active=product.is_active,
            is_available=product.is_available,
            created_at=to_utc_iso(product.created_at),
            updated_at=to_utc_iso(product.updated_at),
            categories=[ProductCategoryPayload.from_model(category) for category in categories],
            ingredients=[
                ProductIngredientPayload(
                    ingredient_id=ingredient.id,
                    name=ingredient.name,
                    slug=ingredient.slug,
                    is_removable=is_removable,
                )
                for ingredient, is_removable in ingredients
            ],
        )
