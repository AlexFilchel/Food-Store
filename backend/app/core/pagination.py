from math import ceil
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PageParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number starting at 1"),
        size: int = Query(20, ge=1, le=100, description="Page size"),
    ) -> None:
        self.page = page
        self.size = size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


def make_paginated_response(*, items: list[T], total: int, page: int, size: int) -> PaginatedResponse[T]:
    pages = ceil(total / size) if total else 0
    return PaginatedResponse[T](items=items, total=total, page=page, size=size, pages=pages)
