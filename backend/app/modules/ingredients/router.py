from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.pagination import PageParams, PaginatedResponse
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import require_role
from app.modules.ingredients.schemas import (
    AllergenCreateRequest,
    AllergenResponse,
    AllergenUpdateRequest,
    IngredientCreateRequest,
    IngredientResponse,
    IngredientUpdateRequest,
)
from app.modules.ingredients.service import ingredient_service

ingredient_router = APIRouter(prefix="/admin/ingredients", tags=["admin-ingredients"], dependencies=[Depends(require_role("ADMIN"))])
allergen_router = APIRouter(prefix="/admin/allergens", tags=["admin-allergens"], dependencies=[Depends(require_role("ADMIN"))])


@ingredient_router.get("", response_model=PaginatedResponse[IngredientResponse])
async def list_ingredients(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    include_inactive: bool = Query(False),
    search: str | None = Query(default=None, max_length=120),
    allergen_id: int | None = Query(default=None, ge=1),
) -> PaginatedResponse[IngredientResponse]:
    return await ingredient_service.list_ingredients(
        uow,
        page_params,
        include_inactive=include_inactive,
        search=search,
        allergen_id=allergen_id,
    )


@ingredient_router.get("/{ingredient_id}", response_model=IngredientResponse)
async def get_ingredient_detail(ingredient_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> IngredientResponse:
    return await ingredient_service.get_ingredient_detail(uow, ingredient_id)


@ingredient_router.post("", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(payload: IngredientCreateRequest, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> IngredientResponse:
    return await ingredient_service.create_ingredient(uow, payload)


@ingredient_router.patch("/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    payload: IngredientUpdateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> IngredientResponse:
    return await ingredient_service.update_ingredient(uow, ingredient_id, payload)


@ingredient_router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(ingredient_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> Response:
    await ingredient_service.delete_ingredient(uow, ingredient_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@allergen_router.get("", response_model=PaginatedResponse[AllergenResponse])
async def list_allergens(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    include_inactive: bool = Query(False),
    search: str | None = Query(default=None, max_length=120),
) -> PaginatedResponse[AllergenResponse]:
    return await ingredient_service.list_allergens(uow, page_params, include_inactive=include_inactive, search=search)


@allergen_router.get("/{allergen_id}", response_model=AllergenResponse)
async def get_allergen_detail(allergen_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> AllergenResponse:
    return await ingredient_service.get_allergen_detail(uow, allergen_id)


@allergen_router.post("", response_model=AllergenResponse, status_code=status.HTTP_201_CREATED)
async def create_allergen(payload: AllergenCreateRequest, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> AllergenResponse:
    return await ingredient_service.create_allergen(uow, payload)


@allergen_router.patch("/{allergen_id}", response_model=AllergenResponse)
async def update_allergen(
    allergen_id: int,
    payload: AllergenUpdateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AllergenResponse:
    return await ingredient_service.update_allergen(uow, allergen_id, payload)


@allergen_router.delete("/{allergen_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allergen(allergen_id: int, uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)]) -> Response:
    await ingredient_service.delete_allergen(uow, allergen_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
