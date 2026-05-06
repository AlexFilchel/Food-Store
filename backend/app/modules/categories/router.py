from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.pagination import PageParams, PaginatedResponse
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import require_role
from app.modules.categories.schemas import CategoryCreateRequest, CategoryResponse, CategoryTreeResponse, CategoryUpdateRequest
from app.modules.categories.service import category_service

router = APIRouter(
    prefix="/admin/categories",
    tags=["admin-categories"],
    dependencies=[Depends(require_role("ADMIN"))],
)


@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    include_inactive: bool = Query(False),
    parent_id: int | None = Query(default=None, ge=1),
) -> PaginatedResponse[CategoryResponse]:
    return await category_service.list_categories(
        uow,
        page_params,
        include_inactive=include_inactive,
        parent_id=parent_id if parent_id is not None else ..., 
    )


@router.get("/tree", response_model=list[CategoryTreeResponse])
async def get_category_tree(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    include_inactive: bool = Query(False),
) -> list[CategoryTreeResponse]:
    return await category_service.get_tree(uow, include_inactive=include_inactive)


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category_detail(
    category_id: int,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CategoryResponse:
    return await category_service.get_detail(uow, category_id)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CategoryResponse:
    return await category_service.create_category(uow, payload)


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    payload: CategoryUpdateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CategoryResponse:
    return await category_service.update_category(uow, category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> Response:
    await category_service.delete_category(uow, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
