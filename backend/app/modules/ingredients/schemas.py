from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.time import to_utc_iso
from app.modules.ingredients.model import Allergen, Ingredient


def _normalize_name(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        raise ValueError("String should have at least 1 character")
    return candidate


def _normalize_description(value: str | None) -> str | None:
    if value is None:
        return None
    candidate = value.strip()
    return candidate or None


class AllergenPayload(BaseModel):
    id: int
    name: str
    slug: str

    @classmethod
    def from_model(cls, allergen: Allergen) -> "AllergenPayload":
        return cls(id=allergen.id, name=allergen.name, slug=allergen.slug)


class IngredientCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True
    allergen_ids: list[int] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _normalize_name(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return _normalize_description(value)


class IngredientUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
    allergen_ids: list[int] | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_name(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return _normalize_description(value)


class AllergenCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


class AllergenUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class AllergenResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, allergen: Allergen) -> "AllergenResponse":
        return cls(
            id=allergen.id,
            name=allergen.name,
            slug=allergen.slug,
            description=allergen.description,
            is_active=allergen.is_active,
            created_at=to_utc_iso(allergen.created_at),
            updated_at=to_utc_iso(allergen.updated_at),
        )


class IngredientResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    is_active: bool
    created_at: str
    updated_at: str
    allergens: list[AllergenPayload]

    @classmethod
    def from_model(cls, ingredient: Ingredient, allergens: list[Allergen]) -> "IngredientResponse":
        return cls(
            id=ingredient.id,
            name=ingredient.name,
            slug=ingredient.slug,
            description=ingredient.description,
            is_active=ingredient.is_active,
            created_at=to_utc_iso(ingredient.created_at),
            updated_at=to_utc_iso(ingredient.updated_at),
            allergens=[AllergenPayload.from_model(allergen) for allergen in allergens],
        )
