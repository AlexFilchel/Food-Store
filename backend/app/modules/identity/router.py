from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.pagination import PageParams, PaginatedResponse
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import require_role
from app.modules.identity.schemas import (
    AdminUserCreateRequest,
    AdminUserDetailResponse,
    AdminUserLifecycleRequest,
    AdminUserLifecycleResponse,
    AdminUserPasswordResetRequest,
    AdminUserPasswordResetResponse,
    AdminUserRoleUpdateRequest,
    AdminUserRoleUpdateResponse,
    AdminUserSummaryResponse,
    AdminUserUpdateRequest,
)
from app.modules.identity.service import AdminUserFilters, admin_user_service

router = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(require_role("ADMIN"))],
)


@router.get("", response_model=PaginatedResponse[AdminUserSummaryResponse])
async def list_admin_users(
    page_params: Annotated[PageParams, Depends()],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    search: str | None = Query(default=None, max_length=160),
    role: str | None = Query(default=None, max_length=50),
    is_active: bool | None = Query(default=None),
) -> PaginatedResponse[AdminUserSummaryResponse]:
    filters = AdminUserFilters(search=search, role_code=role.upper() if role else None, is_active=is_active)
    return await admin_user_service.list_users(uow, page_params=page_params, filters=filters)


@router.post("", response_model=AdminUserDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminUserCreateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserDetailResponse:
    return await admin_user_service.create_user(uow, payload=payload)


@router.get("/{user_id}", response_model=AdminUserDetailResponse)
async def get_admin_user_detail(
    user_id: int,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserDetailResponse:
    return await admin_user_service.get_user_detail(uow, user_id=user_id)


@router.patch("/{user_id}", response_model=AdminUserDetailResponse)
async def update_admin_user_profile(
    user_id: int,
    payload: AdminUserUpdateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserDetailResponse:
    return await admin_user_service.update_user_profile(uow, user_id=user_id, payload=payload)


@router.put("/{user_id}/roles", response_model=AdminUserRoleUpdateResponse)
async def replace_admin_user_roles(
    user_id: int,
    payload: AdminUserRoleUpdateRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserRoleUpdateResponse:
    return await admin_user_service.update_user_roles(uow, user_id=user_id, payload=payload)


@router.put("/{user_id}/lifecycle", response_model=AdminUserLifecycleResponse)
async def update_admin_user_lifecycle(
    user_id: int,
    payload: AdminUserLifecycleRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserLifecycleResponse:
    return await admin_user_service.update_user_lifecycle(uow, user_id=user_id, is_active=payload.is_active)


@router.post("/{user_id}/password-reset", response_model=AdminUserPasswordResetResponse)
async def reset_admin_user_password(
    user_id: int,
    payload: AdminUserPasswordResetRequest,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AdminUserPasswordResetResponse:
    return await admin_user_service.reset_password(uow, user_id=user_id, payload=payload)
