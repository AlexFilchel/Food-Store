from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.identity.model import Role, User, UserRole


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Role)

    async def get_by_code(self, code: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.code == code))
        return result.scalar_one_or_none()


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def get_active_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None), User.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def get_active_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None), User.is_active.is_(True))
        )
        return result.scalar_one_or_none()


class UserRoleRepository(BaseRepository[UserRole]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UserRole)

    async def get_assignment(self, *, user_id: int, role_id: int) -> UserRole | None:
        statement = select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_role_codes(self, *, user_id: int) -> list[str]:
        statement = (
            select(Role.code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
            .order_by(Role.id.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())
