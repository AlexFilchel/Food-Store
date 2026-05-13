from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.identity.model import Role, User, UserRole


class RoleRepository(BaseRepository[Role]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Role)

    async def get_by_code(self, code: str) -> Role | None:
        result = await self.session.execute(select(Role).where(Role.code == code))
        return result.scalar_one_or_none()

    async def list_by_codes(self, codes: list[str]) -> list[Role]:
        if not codes:
            return []
        result = await self.session.execute(select(Role).where(Role.code.in_(sorted(set(codes)))))
        return list(result.scalars().all())


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

    async def list_admin_paginated(
        self,
        *,
        page_params,
        search: str | None,
        role_code: str | None,
        is_active: bool | None,
    ) -> list[User]:
        statement = select(User).where(User.deleted_at.is_(None))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(User.first_name).like(term),
                    func.lower(User.last_name).like(term),
                    func.lower(User.full_name).like(term),
                    func.lower(User.email).like(term),
                )
            )
        if is_active is not None:
            statement = statement.where(User.is_active.is_(is_active))
        if role_code:
            statement = (
                statement
                .join(UserRole, UserRole.user_id == User.id)
                .join(Role, Role.id == UserRole.role_id)
                .where(Role.code == role_code)
            )
        statement = statement.distinct(User.id).order_by(User.id.desc(), User.created_at.desc())
        result = await self.session.execute(statement.offset(page_params.offset).limit(page_params.size))
        return list(result.scalars().all())

    async def count_admin_filtered(
        self,
        *,
        search: str | None,
        role_code: str | None,
        is_active: bool | None,
    ) -> int:
        statement = select(func.count(func.distinct(User.id))).where(User.deleted_at.is_(None))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(User.first_name).like(term),
                    func.lower(User.last_name).like(term),
                    func.lower(User.full_name).like(term),
                    func.lower(User.email).like(term),
                )
            )
        if is_active is not None:
            statement = statement.where(User.is_active.is_(is_active))
        if role_code:
            statement = (
                statement
                .select_from(User)
                .join(UserRole, UserRole.user_id == User.id)
                .join(Role, Role.id == UserRole.role_id)
                .where(Role.code == role_code, User.deleted_at.is_(None))
            )
        result = await self.session.execute(statement)
        return int(result.scalar_one())

    async def get_admin_detail(self, *, user_id: int) -> tuple[User, list[str]] | None:
        statement = (
            select(User, Role.code)
            .outerjoin(UserRole, UserRole.user_id == User.id)
            .outerjoin(Role, Role.id == UserRole.role_id)
            .where(User.id == user_id, User.deleted_at.is_(None))
            .order_by(Role.id.asc())
        )
        result = await self.session.execute(statement)
        rows = list(result.all())
        if not rows:
            return None
        user = rows[0][0]
        role_codes = [row[1] for row in rows if row[1]]
        return user, role_codes

    async def count_active_admins(self) -> int:
        statement = (
            select(func.count(func.distinct(User.id)))
            .select_from(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                User.deleted_at.is_(None),
                User.is_active.is_(True),
                Role.code == "ADMIN",
            )
        )
        result = await self.session.execute(statement)
        return int(result.scalar_one())


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

    async def replace_roles(self, *, user_id: int, role_ids: list[int]) -> None:
        await self.session.execute(UserRole.__table__.delete().where(UserRole.user_id == user_id))
        for role_id in sorted(set(role_ids)):
            self.session.add(UserRole(user_id=user_id, role_id=role_id))
        await self.session.flush()
