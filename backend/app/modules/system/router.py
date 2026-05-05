from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.pagination import PageParams
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.system.schemas import ExamplePaginationResponse, HealthResponse
from app.modules.system.service import system_service

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
async def healthcheck() -> HealthResponse:
    return await system_service.get_health()


@router.get("/contracts/pagination-example", response_model=ExamplePaginationResponse)
async def pagination_example(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> ExamplePaginationResponse:
    return await system_service.get_pagination_example(uow, page_params)
