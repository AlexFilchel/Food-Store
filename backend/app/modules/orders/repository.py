from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import BaseRepository
from app.modules.orders.model import Order, OrderHistory, OrderItem, OrderState


class OrderStateRepository(BaseRepository[OrderState]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrderState)

    async def get_by_code(self, code: str) -> OrderState | None:
        result = await self.session.execute(select(OrderState).where(OrderState.code == code))
        return result.scalar_one_or_none()


class OrderRepository(BaseRepository[Order]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Order)

    async def get_by_order_number(self, order_number: str) -> Order | None:
        result = await self.session.execute(select(Order).where(Order.order_number == order_number))
        return result.scalar_one_or_none()

    async def get_by_id_for_user(self, *, order_id: int, user_id: int) -> Order | None:
        result = await self.session.execute(
            select(Order).where(Order.id == order_id, Order.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, *, user_id: int) -> list[Order]:
        result = await self.session.execute(
            select(Order)
            .where(Order.user_id == user_id)
            .order_by(Order.created_at.desc(), Order.id.desc())
        )
        return list(result.scalars().all())


class OrderItemRepository(BaseRepository[OrderItem]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrderItem)

    async def list_by_order(self, *, order_id: int) -> list[OrderItem]:
        result = await self.session.execute(
            select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.id)
        )
        return list(result.scalars().all())


class OrderHistoryRepository(BaseRepository[OrderHistory]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrderHistory)

    async def list_by_order(self, *, order_id: int) -> list[OrderHistory]:
        result = await self.session.execute(
            select(OrderHistory).where(OrderHistory.order_id == order_id).order_by(OrderHistory.created_at)
        )
        return list(result.scalars().all())
