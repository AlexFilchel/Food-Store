from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.orders.model import OrderState


class OrderStateRepository(BaseRepository[OrderState]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrderState)

    async def get_by_code(self, code: str) -> OrderState | None:
        result = await self.session.execute(select(OrderState).where(OrderState.code == code))
        return result.scalar_one_or_none()
