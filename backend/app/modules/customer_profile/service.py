from app.core.security import hash_password, verify_password
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.customer_profile.errors import (
    customer_profile_duplicate_email,
    customer_profile_invalid_current_password,
)
from app.modules.customer_profile.schemas import (
    CustomerChangePasswordRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from app.modules.identity.model import User


class CustomerProfileService:
    async def get_profile(self, uow: SqlAlchemyUnitOfWork, current_user: User) -> CustomerProfileResponse:
        async with uow:
            user = await uow.users.get_active_by_id(current_user.id)
            if user is None:
                raise RuntimeError("Current authenticated user not found")
            roles = await uow.user_roles.list_role_codes(user_id=current_user.id)
            return self._build_profile(user=user, roles=roles)

    async def update_profile(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        current_user: User,
        payload: CustomerProfileUpdateRequest,
    ) -> CustomerProfileResponse:
        async with uow:
            user = await uow.users.get_active_by_id(current_user.id)
            if user is None:
                raise RuntimeError("Current authenticated user not found")

            existing_email_owner = await uow.users.get_active_by_email(payload.email)
            if existing_email_owner is not None and existing_email_owner.id != user.id:
                raise customer_profile_duplicate_email()

            await uow.users.update(
                user,
                {
                    "first_name": payload.first_name,
                    "last_name": payload.last_name,
                    "full_name": f"{payload.first_name} {payload.last_name}".strip(),
                    "email": payload.email,
                },
            )

            roles = await uow.user_roles.list_role_codes(user_id=user.id)
            return self._build_profile(user=user, roles=roles)

    async def change_password(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        current_user: User,
        payload: CustomerChangePasswordRequest,
    ) -> None:
        async with uow:
            user = await uow.users.get_active_by_id(current_user.id)
            if user is None:
                raise RuntimeError("Current authenticated user not found")

            if not verify_password(payload.current_password, user.hashed_password):
                raise customer_profile_invalid_current_password()

            await uow.users.update(user, {"hashed_password": hash_password(payload.new_password)})

    def _build_profile(self, *, user: User, roles: list[str]) -> CustomerProfileResponse:
        return CustomerProfileResponse.from_values(
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            roles=roles,
            created_at=user.created_at,
        )


customer_profile_service = CustomerProfileService()
