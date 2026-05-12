from sqlalchemy import func, select
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

    async def list_by_user_paginated(
        self,
        *,
        user_id: int,
        state_code: str | None,
        skip: int,
        limit: int,
    ) -> list[Order]:
        query = select(Order).where(Order.user_id == user_id)
        if state_code:
            query = query.join(OrderState, OrderState.id == Order.state_id).where(OrderState.code == state_code)
        result = await self.session.execute(
            query.order_by(Order.created_at.desc(), Order.id.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_user(self, *, user_id: int, state_code: str | None) -> int:
        query = select(func.count(Order.id)).where(Order.user_id == user_id)
        if state_code:
            query = query.join(OrderState, OrderState.id == Order.state_id).where(OrderState.code == state_code)
        result = await self.session.execute(query)
        return int(result.scalar_one())

    async def get_by_id_for_update(self, *, order_id: int) -> Order | None:
        result = await self.session.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        )
        return result.scalar_one_or_none()


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

    async def get_history_by_event_key(self, *, event_key: str) -> OrderHistory | None:
        result = await self.session.execute(select(OrderHistory).where(OrderHistory.event_key == event_key))
        return result.scalar_one_or_none()
