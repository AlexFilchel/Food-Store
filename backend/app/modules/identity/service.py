from __future__ import annotations

from dataclasses import dataclass

from app.core.pagination import PageParams, PaginatedResponse, make_paginated_response
from app.core.security import hash_password
from app.core.time import utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.auth.repository import RefreshTokenRepository
from app.modules.identity.errors import (
    admin_user_duplicate_email,
    admin_user_invalid_role,
    admin_user_last_admin_forbidden,
    admin_user_not_found,
)
from app.modules.identity.model import User
from app.modules.identity.schemas import (
    AdminUserCreateRequest,
    AdminUserDetailResponse,
    AdminUserLifecycleResponse,
    AdminUserPasswordResetRequest,
    AdminUserPasswordResetResponse,
    AdminUserRoleUpdateRequest,
    AdminUserRoleUpdateResponse,
    AdminUserSummaryResponse,
    AdminUserUpdateRequest,
)


@dataclass(slots=True)
class AdminUserFilters:
    search: str | None = None
    role_code: str | None = None
    is_active: bool | None = None


class AdminUserService:
    async def list_users(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        page_params: PageParams,
        filters: AdminUserFilters,
    ) -> PaginatedResponse[AdminUserSummaryResponse]:
        async with uow:
            users = await uow.users.list_admin_paginated(
                page_params=page_params,
                search=filters.search,
                role_code=filters.role_code,
                is_active=filters.is_active,
            )
            total = await uow.users.count_admin_filtered(
                search=filters.search,
                role_code=filters.role_code,
                is_active=filters.is_active,
            )
            items: list[AdminUserSummaryResponse] = []
            for user in users:
                roles = await uow.user_roles.list_role_codes(user_id=user.id)
                items.append(AdminUserSummaryResponse.from_model(user, roles=roles))
            return make_paginated_response(
                items=items,
                total=total,
                page=page_params.page,
                size=page_params.size,
            )

    async def get_user_detail(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
    ) -> AdminUserDetailResponse:
        async with uow:
            detail = await uow.users.get_admin_detail(user_id=user_id)
            if detail is None:
                raise admin_user_not_found()
            user, roles = detail
            return AdminUserDetailResponse.from_model(user, roles=roles)

    async def create_user(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        payload: AdminUserCreateRequest,
    ) -> AdminUserDetailResponse:
        async with uow:
            existing = await uow.users.get_by_email(payload.email)
            if existing is not None:
                raise admin_user_duplicate_email()

            roles = await uow.roles.list_by_codes(payload.role_codes)
            if len(roles) != len(set(payload.role_codes)):
                missing = set(payload.role_codes) - {role.code for role in roles}
                raise admin_user_invalid_role(role_code=sorted(missing)[0])

            user = await uow.users.create(
                User(
                    first_name=payload.first_name.strip(),
                    last_name=payload.last_name.strip(),
                    full_name=self._build_full_name(payload.first_name, payload.last_name),
                    email=payload.email,
                    hashed_password=hash_password(payload.password),
                    is_active=payload.is_active,
                )
            )
            await uow.user_roles.replace_roles(user_id=user.id, role_ids=[role.id for role in roles])
            role_codes = [role.code for role in roles]
            return AdminUserDetailResponse.from_model(user, roles=role_codes)

    async def update_user_profile(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payload: AdminUserUpdateRequest,
    ) -> AdminUserDetailResponse:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if user is None or user.deleted_at is not None:
                raise admin_user_not_found()

            updates = payload.model_dump(exclude_unset=True)
            if "email" in updates:
                existing = await uow.users.get_active_by_email(updates["email"])
                if existing is not None and existing.id != user.id:
                    raise admin_user_duplicate_email()
            if "first_name" in updates or "last_name" in updates:
                first_name = updates.get("first_name", user.first_name)
                last_name = updates.get("last_name", user.last_name)
                updates["full_name"] = self._build_full_name(first_name, last_name)

            await uow.users.update(user, updates)
            roles = await uow.user_roles.list_role_codes(user_id=user.id)
            return AdminUserDetailResponse.from_model(user, roles=roles)

    async def update_user_roles(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payload: AdminUserRoleUpdateRequest,
    ) -> AdminUserRoleUpdateResponse:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if user is None or user.deleted_at is not None:
                raise admin_user_not_found()

            roles = await uow.roles.list_by_codes(payload.role_codes)
            if len(roles) != len(set(payload.role_codes)):
                missing = set(payload.role_codes) - {role.code for role in roles}
                raise admin_user_invalid_role(role_code=sorted(missing)[0])

            role_codes = [role.code for role in roles]
            if "ADMIN" not in role_codes:
                current_roles = await uow.user_roles.list_role_codes(user_id=user.id)
                if "ADMIN" in current_roles:
                    active_admins = await uow.users.count_active_admins()
                    if user.is_active and active_admins <= 1:
                        raise admin_user_last_admin_forbidden(action="remove ADMIN role from")

            await uow.user_roles.replace_roles(user_id=user.id, role_ids=[role.id for role in roles])
            return AdminUserRoleUpdateResponse(user_id=user.id, roles=role_codes)

    async def update_user_lifecycle(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        is_active: bool,
    ) -> AdminUserLifecycleResponse:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if user is None or user.deleted_at is not None:
                raise admin_user_not_found()

            if user.is_active and not is_active:
                roles = await uow.user_roles.list_role_codes(user_id=user.id)
                if "ADMIN" in roles:
                    active_admins = await uow.users.count_active_admins()
                    if active_admins <= 1:
                        raise admin_user_last_admin_forbidden(action="deactivate")

            await uow.users.update(user, {"is_active": is_active})
            return AdminUserLifecycleResponse(user_id=user.id, is_active=user.is_active)

    async def reset_password(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payload: AdminUserPasswordResetRequest,
    ) -> AdminUserPasswordResetResponse:
        async with uow:
            user = await uow.users.get_by_id(user_id)
            if user is None or user.deleted_at is not None:
                raise admin_user_not_found()

            await uow.users.update(user, {"hashed_password": hash_password(payload.new_password)})
            await self._revoke_refresh_tokens(uow, user_id=user.id)
            return AdminUserPasswordResetResponse.from_values(user_id=user.id, reset_at=utc_now())

    async def _revoke_refresh_tokens(self, uow: SqlAlchemyUnitOfWork, *, user_id: int) -> None:
        repository = RefreshTokenRepository(uow.session)
        await repository.revoke_user_tokens(user_id=user_id, revoked_at=utc_now())

    @staticmethod
    def _build_full_name(first_name: str, last_name: str) -> str:
        return f"{first_name.strip()} {last_name.strip()}".strip()


admin_user_service = AdminUserService()
