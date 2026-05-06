from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.errors import auth_invalid_token
from app.modules.auth.service import auth_service, ownership_service
from app.modules.identity.model import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> User:
    if credentials is None or not credentials.credentials:
        raise auth_invalid_token()
    return await auth_service.get_current_user(uow, credentials.credentials)


def require_role(*allowed_roles: str):
    async def dependency(
        user: Annotated[User, Depends(get_current_user)],
        uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    ) -> User:
        return await auth_service.require_roles(uow, user, set(allowed_roles))

    return dependency


async def get_current_role_codes(
    user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> set[str]:
    async with uow:
        return set(await uow.user_roles.list_role_codes(user_id=user.id))


def enforce_owner_or_roles(*, current_user: User, owner_user_id: int, current_role_codes: set[str], allowed_roles: set[str]) -> None:
    ownership_service.ensure_owner_or_role(
        current_user_id=current_user.id,
        owner_user_id=owner_user_id,
        role_codes=current_role_codes,
        allowed_roles=allowed_roles,
    )
