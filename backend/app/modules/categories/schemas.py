from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.time import to_utc_iso
from app.modules.categories.model import Category


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


class CategoryCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    parent_id: int | None = Field(default=None, ge=1)
    sort_order: int = 0
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _normalize_name(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return _normalize_description(value)


class CategoryUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    parent_id: int | None = Field(default=None, ge=1)
    sort_order: int | None = None
    is_active: bool | None = None

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


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    parent_id: int | None
    sort_order: int
    is_active: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, category: Category) -> "CategoryResponse":
        return cls(
            id=category.id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            parent_id=category.parent_id,
            sort_order=category.sort_order,
            is_active=category.is_active,
            created_at=to_utc_iso(category.created_at),
            updated_at=to_utc_iso(category.updated_at),
        )


class CategoryTreeResponse(CategoryResponse):
    children: list["CategoryTreeResponse"]

    @classmethod
    def from_model(cls, category: Category, children: list["CategoryTreeResponse"]) -> "CategoryTreeResponse":
        payload = CategoryResponse.from_model(category)
        return cls(**payload.model_dump(), children=children)


class CategoryHierarchyRecord(BaseModel):
    id: int
    parent_id: int | None


class CategoryPersistenceRecord(BaseModel):
    name: str
    slug: str
    description: str | None
    parent_id: int | None
    sort_order: int
    is_active: bool


class CategoryLookupResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None


def sort_tree_nodes(nodes: list[CategoryTreeResponse]) -> list[CategoryTreeResponse]:
    return sorted(nodes, key=lambda node: (node.sort_order, node.name.lower(), node.id))
