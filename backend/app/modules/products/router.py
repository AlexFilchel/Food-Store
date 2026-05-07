from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.pagination import PageParams, PaginatedResponse
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import require_role
from app.modules.products.schemas import ProductCreateRequest, ProductResponse, ProductUpdateRequest
from app.modules.products.service import product_service

router = APIRouter(prefix="/admin/products", tags=["admin-products"], dependencies=[Depends(require_role("ADMIN"))])


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    search: str | None = Query(default=None, max_length=160),
    category_id: int | None = Query(default=None, ge=1),
    ingredient_id: int | None = Query(default=None, ge=1),
    include_inactive: bool = Query(False),
    availability: bool | None = Query(default=None),
    stock_state: Literal["in_stock", "out_of_stock"] | None = Query(default=None),
) -> PaginatedResponse[ProductResponse]:
    return await product_service.list_products(
        uow,
        page_params,
        include_inactive=include_inactive,
        search=search,
        category_id=category_id,
        ingredient_id=ingredient_id,
        availability=availability,
        stock_state=stock_state,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product_detail(product_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> ProductResponse:
    return await product_service.get_detail(uow, product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreateRequest, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> ProductResponse:
    return await product_service.create_product(uow, payload)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, payload: ProductUpdateRequest, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> ProductResponse:
    return await product_service.update_product(uow, product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> Response:
    await product_service.delete_product(uow, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
