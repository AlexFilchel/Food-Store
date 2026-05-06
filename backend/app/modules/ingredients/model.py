from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel

from app.core.models import AuditMixin, SoftDeleteMixin


class Ingredient(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "ingredients"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    slug: str = Field(sa_column=Column(String(140), nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))


class Allergen(AuditMixin, SoftDeleteMixin, table=True):
    __tablename__ = "allergens"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    slug: str = Field(sa_column=Column(String(140), nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="1"))


class IngredientAllergen(SQLModel, table=True):
    __tablename__ = "ingredient_allergens"

    ingredient_id: int = Field(
        sa_column=Column(Integer, ForeignKey("ingredients.id", ondelete="RESTRICT"), primary_key=True),
    )
    allergen_id: int = Field(
        sa_column=Column(Integer, ForeignKey("allergens.id", ondelete="RESTRICT"), primary_key=True),
    )
