from datetime import datetime

from sqlalchemy import func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.repository import BaseRepository
from app.modules.identity.model import User
from app.modules.orders.model import Order, OrderHistory, OrderItem, OrderState
from app.modules.payments.model import Payment, PaymentStatus


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

    async def list_operations_paginated(
        self,
        *,
        state_code: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
        customer: str | None,
        payment_status_code: str | None,
        skip: int,
        limit: int,
    ) -> list[tuple[Order, OrderState, User, Payment | None, PaymentStatus | None]]:
        latest_payment_stmt = (
            select(Payment)
            .where(Payment.order_id == Order.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(1)
            .lateral()
        )
        latest_payment = aliased(Payment, latest_payment_stmt)
        statement = (
            select(Order, OrderState, User, latest_payment, PaymentStatus)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(User, User.id == Order.user_id)
            .outerjoin(latest_payment, true())
            .outerjoin(PaymentStatus, PaymentStatus.id == latest_payment.status_id)
        )

        if state_code:
            statement = statement.where(OrderState.code == state_code)
        if date_from:
            statement = statement.where(Order.created_at >= date_from)
        if date_to:
            statement = statement.where(Order.created_at <= date_to)
        if customer:
            term = f"%{customer.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(User.first_name).like(term),
                    func.lower(User.last_name).like(term),
                    func.lower(User.full_name).like(term),
                    func.lower(User.email).like(term),
                )
            )
        if payment_status_code:
            statement = statement.where(PaymentStatus.code == payment_status_code)

        result = await self.session.execute(
            statement.order_by(Order.created_at.desc(), Order.id.desc()).offset(skip).limit(limit)
        )
        return list(result.all())

    async def count_operations(
        self,
        *,
        state_code: str | None,
        date_from: datetime | None,
        date_to: datetime | None,
        customer: str | None,
        payment_status_code: str | None,
    ) -> int:
        latest_payment_stmt = (
            select(Payment)
            .where(Payment.order_id == Order.id)
            .order_by(Payment.created_at.desc(), Payment.id.desc())
            .limit(1)
            .lateral()
        )
        latest_payment = aliased(Payment, latest_payment_stmt)
        statement = (
            select(func.count(func.distinct(Order.id)))
            .select_from(Order)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(User, User.id == Order.user_id)
            .outerjoin(latest_payment, true())
            .outerjoin(PaymentStatus, PaymentStatus.id == latest_payment.status_id)
        )
        if state_code:
            statement = statement.where(OrderState.code == state_code)
        if date_from:
            statement = statement.where(Order.created_at >= date_from)
        if date_to:
            statement = statement.where(Order.created_at <= date_to)
        if customer:
            term = f"%{customer.strip().lower()}%"
            statement = statement.where(
                or_(
                    func.lower(User.first_name).like(term),
                    func.lower(User.last_name).like(term),
                    func.lower(User.full_name).like(term),
                    func.lower(User.email).like(term),
                )
            )
        if payment_status_code:
            statement = statement.where(PaymentStatus.code == payment_status_code)
        result = await self.session.execute(statement)
        return int(result.scalar_one())


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
