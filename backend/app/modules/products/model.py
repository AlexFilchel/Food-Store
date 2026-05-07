from decimal import Decimal

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin, SoftDeleteMixin


class Product(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "products"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(160), nullable=False))
    slug: str = Field(sa_column=Column(String(180), nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    price: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    stock_quantity: int = Field(default=0, sa_column=Column(Integer, nullable=False, server_default="0"))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))
    is_available: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))


class ProductCategory(SQLModel, table=True):
    __tablename__ = "product_categories"

    product_id: int = Field(sa_column=Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), primary_key=True))
    category_id: int = Field(sa_column=Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True))


class ProductIngredient(SQLModel, table=True):
    __tablename__ = "product_ingredients"

    product_id: int = Field(sa_column=Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), primary_key=True))
    ingredient_id: int = Field(sa_column=Column(Integer, ForeignKey("ingredients.id", ondelete="RESTRICT"), primary_key=True))
    is_removable: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))
