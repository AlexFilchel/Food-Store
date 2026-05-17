from typing import Annotated

from fastapi import APIRouter, Depends, Header

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.identity.model import User
from app.modules.system_configuration.schemas import (
    SystemConfigurationAdminListResponse,
    SystemConfigurationPatchRequest,
    SystemConfigurationPublicResponse,
)
from app.modules.system_configuration.service import system_configuration_service

admin_router = APIRouter(
    prefix="/admin/system/configuration",
    tags=["admin-system-configuration"],
    dependencies=[Depends(require_role("ADMIN"))],
)

public_router = APIRouter(prefix="/system/configuration", tags=["system-configuration"])


@admin_router.get("", response_model=SystemConfigurationAdminListResponse)
async def get_admin_system_configuration(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> SystemConfigurationAdminListResponse:
    return await system_configuration_service.admin_list(uow)


@admin_router.patch("", response_model=SystemConfigurationAdminListResponse)
async def patch_admin_system_configuration(
    payload: SystemConfigurationPatchRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    request_id: Annotated[str | None, Header(alias="x-request-id")] = None,
) -> SystemConfigurationAdminListResponse:
    return await system_configuration_service.patch(uow, payload=payload, current_user=current_user, request_id=request_id)


@public_router.get("/public", response_model=SystemConfigurationPublicResponse)
async def get_public_system_configuration(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> SystemConfigurationPublicResponse:
    return await system_configuration_service.public_values(uow)
