from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.payments.model import PaymentMethod


class PaymentMethodRepository(BaseRepository[PaymentMethod]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PaymentMethod)

    async def get_by_code(self, code: str) -> PaymentMethod | None:
        result = await self.session.execute(select(PaymentMethod).where(PaymentMethod.code == code))
        return result.scalar_one_or_none()
