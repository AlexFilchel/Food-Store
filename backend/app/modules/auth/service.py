from dataclasses import dataclass
from datetime import timedelta
from uuid import uuid4

from jose import ExpiredSignatureError, JWTError

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    password_hash_rounds,
    verify_password,
    verify_refresh_token,
)
from app.core.time import ensure_utc, utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.auth.errors import (
    auth_email_already_registered,
    auth_forbidden,
    auth_invalid_credentials,
    auth_invalid_token,
    auth_refresh_replay_detected,
    auth_token_expired,
)
from app.modules.auth.model import RefreshToken
from app.modules.auth.schemas import (
    AuthLoginRequest,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    AuthUserResponse,
)
from app.modules.identity.model import User, UserRole


@dataclass(slots=True)
class RequestContext:
    client_ip: str | None
    user_agent: str | None


class AuthService:
    def __init__(self) -> None:
        if password_hash_rounds() < 10:
            raise RuntimeError("bcrypt rounds must be at least 10")

    async def register(
        self,
        uow: SqlAlchemyUnitOfWork,
        payload: AuthRegisterRequest,
        context: RequestContext,
    ) -> AuthTokenResponse:
        async with uow:
            existing_user = await uow.users.get_by_email(payload.email)
            if existing_user is not None:
                raise auth_email_already_registered()

            client_role = await uow.roles.get_by_code("CLIENT")
            if client_role is None:
                raise RuntimeError("CLIENT role seed is missing")

            user = await uow.users.create(
                User(
                    first_name=payload.first_name.strip(),
                    last_name=payload.last_name.strip(),
                    full_name=self._build_full_name(payload.first_name, payload.last_name),
                    email=payload.email,
                    hashed_password=hash_password(payload.password),
                    is_active=True,
                )
            )
            await uow.user_roles.create(UserRole(user_id=user.id, role_id=client_role.id))
            return await self._issue_token_response(uow=uow, user=user, roles=[client_role.code], context=context)

    async def login(
        self,
        uow: SqlAlchemyUnitOfWork,
        payload: AuthLoginRequest,
        context: RequestContext,
    ) -> AuthTokenResponse:
        async with uow:
            user = await uow.users.get_by_email(payload.email)
            if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
                raise auth_invalid_credentials()
            roles = await uow.user_roles.list_role_codes(user_id=user.id)
            return await self._issue_token_response(uow=uow, user=user, roles=roles, context=context)

    async def refresh(
        self,
        uow: SqlAlchemyUnitOfWork,
        payload: AuthRefreshRequest,
        context: RequestContext,
    ) -> AuthTokenResponse:
        async with uow:
            stored_token = await self._get_refresh_token_or_fail(uow, payload.refresh_token)
            if ensure_utc(stored_token.expires_at) <= utc_now():
                raise auth_token_expired()

            if stored_token.used_at is not None or stored_token.revoked_at is not None:
                await self._revoke_replay_family(uow, stored_token)
                raise auth_refresh_replay_detected()

            user = await uow.users.get_active_by_id(stored_token.user_id)
            if user is None:
                raise auth_invalid_token()

            roles = await uow.user_roles.list_role_codes(user_id=user.id)
            await uow.refresh_tokens.mark_used(stored_token, used_at=utc_now())
            return await self._issue_token_response(
                uow=uow,
                user=user,
                roles=roles,
                context=context,
                family_id=stored_token.family_id,
                rotated_from_id=stored_token.id,
            )

    async def logout(
        self,
        uow: SqlAlchemyUnitOfWork,
        current_user: User,
        payload: AuthLogoutRequest,
    ) -> None:
        async with uow:
            stored_token = await self._get_refresh_token_or_fail(uow, payload.refresh_token)
            if stored_token.user_id != current_user.id:
                raise auth_forbidden()
            if ensure_utc(stored_token.expires_at) <= utc_now():
                raise auth_token_expired()
            if stored_token.used_at is not None or stored_token.revoked_at is not None:
                raise auth_invalid_token()
            await uow.refresh_tokens.revoke(stored_token, revoked_at=utc_now())

    async def get_current_user(self, uow: SqlAlchemyUnitOfWork, token: str) -> User:
        try:
            claims = decode_access_token(token)
            user_id = int(claims.subject)
        except ExpiredSignatureError as exc:
            raise auth_token_expired() from exc
        except (JWTError, ValueError) as exc:
            raise auth_invalid_token() from exc

        async with uow:
            user = await uow.users.get_active_by_id(user_id)
            if user is None:
                raise auth_invalid_token()
            return user

    async def get_current_user_response(self, uow: SqlAlchemyUnitOfWork, user: User) -> AuthUserResponse:
        async with uow:
            roles = await uow.user_roles.list_role_codes(user_id=user.id)
            return self._build_user_response(user=user, roles=roles)

    async def require_roles(self, uow: SqlAlchemyUnitOfWork, user: User, allowed_roles: set[str]) -> User:
        async with uow:
            roles = set(await uow.user_roles.list_role_codes(user_id=user.id))
            if roles.isdisjoint(allowed_roles):
                raise auth_forbidden()
            return user

    async def _issue_token_response(
        self,
        *,
        uow: SqlAlchemyUnitOfWork,
        user: User,
        roles: list[str],
        context: RequestContext,
        family_id: str | None = None,
        rotated_from_id: int | None = None,
    ) -> AuthTokenResponse:
        settings = get_settings()
        access_token = create_access_token(subject=str(user.id), email=user.email, roles=roles)
        refresh_token = generate_refresh_token()
        expires_at = utc_now() + timedelta(days=settings.refresh_token_expire_days)
        await uow.refresh_tokens.create(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(refresh_token),
                family_id=family_id or str(uuid4()),
                rotated_from_id=rotated_from_id,
                expires_at=expires_at,
                created_by_ip=context.client_ip,
                user_agent=context.user_agent,
            )
        )
        return AuthTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
            user=self._build_user_response(user=user, roles=roles),
        )

    async def _get_refresh_token_or_fail(self, uow: SqlAlchemyUnitOfWork, refresh_token: str) -> RefreshToken:
        token_hash = hash_refresh_token(refresh_token)
        stored_token = await uow.refresh_tokens.get_by_hash(token_hash)
        if stored_token is None or not verify_refresh_token(refresh_token, stored_token.token_hash):
            raise auth_invalid_token()
        return stored_token

    async def _revoke_replay_family(self, uow: SqlAlchemyUnitOfWork, stored_token: RefreshToken) -> None:
        revoked_at = utc_now()
        await uow.refresh_tokens.revoke_family(family_id=stored_token.family_id, revoked_at=revoked_at)

    def _build_user_response(self, *, user: User, roles: list[str]) -> AuthUserResponse:
        return AuthUserResponse.from_values(
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            roles=roles,
            created_at=user.created_at,
        )

    @staticmethod
    def _build_full_name(first_name: str, last_name: str) -> str:
        return f"{first_name.strip()} {last_name.strip()}".strip()


class OwnershipService:
    @staticmethod
    def ensure_owner_or_role(*, current_user_id: int, owner_user_id: int, role_codes: set[str], allowed_roles: set[str]) -> None:
        if current_user_id == owner_user_id:
            return
        if role_codes.isdisjoint(allowed_roles):
            raise auth_forbidden()


auth_service = AuthService()
ownership_service = OwnershipService()
