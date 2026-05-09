from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.pagination import PageParams, PaginatedResponse
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.products.schemas import PublicProductResponse
from app.modules.products.service import product_service

router = APIRouter(prefix="/catalog/products", tags=["public-catalog-products"])


@router.get("", response_model=PaginatedResponse[PublicProductResponse])
async def list_public_products(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    search: str | None = Query(default=None, max_length=160),
    category_id: int | None = Query(default=None, ge=1),
) -> PaginatedResponse[PublicProductResponse]:
    return await product_service.list_public_products(uow, page_params, search=search, category_id=category_id)


@router.get("/{product_id_or_slug}", response_model=PublicProductResponse)
async def get_public_product_detail(
    product_id_or_slug: str,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PublicProductResponse:
    return await product_service.get_public_detail(uow, product_id_or_slug)
