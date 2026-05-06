from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.auth.model import RefreshToken


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RefreshToken)

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        return result.scalar_one_or_none()

    async def mark_used(self, token: RefreshToken, *, used_at: datetime) -> RefreshToken:
        token.used_at = used_at
        await self.session.flush()
        await self.session.refresh(token)
        return token

    async def revoke(self, token: RefreshToken, *, revoked_at: datetime) -> RefreshToken:
        token.revoked_at = revoked_at
        await self.session.flush()
        await self.session.refresh(token)
        return token

    async def revoke_family(self, *, family_id: str, revoked_at: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )
        await self.session.flush()

    async def revoke_user_tokens(self, *, user_id: int, revoked_at: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )
        await self.session.flush()
