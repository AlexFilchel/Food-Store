from datetime import datetime
from decimal import Decimal

from sqlalchemy import and_, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.model import Order, OrderItem, OrderState
from app.modules.payments.model import Payment, PaymentStatus

REVENUE_ELIGIBLE_ORDER_STATES = ("CONFIRMADO", "EN_PREPARACION", "EN_CAMINO", "ENTREGADO")


class AdminDashboardMetricsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_summary(
        self,
        *,
        from_utc: datetime,
        to_utc: datetime,
        pending_states: tuple[str, ...],
    ) -> dict[str, Decimal | int]:
        revenue_stmt = (
            select(
                func.coalesce(func.sum(OrderItem.line_total), 0),
                func.count(distinct(Order.id)),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(Payment, Payment.order_id == Order.id)
            .join(PaymentStatus, PaymentStatus.id == Payment.status_id)
            .where(
                PaymentStatus.code == "APPROVED",
                OrderState.code.in_(REVENUE_ELIGIBLE_ORDER_STATES),
                Payment.created_at >= from_utc,
                Payment.created_at <= to_utc,
            )
        )
        revenue_row = (await self.session.execute(revenue_stmt)).one()

        pending_stmt = (
            select(func.count(Order.id))
            .join(OrderState, OrderState.id == Order.state_id)
            .where(
                Order.created_at >= from_utc,
                Order.created_at <= to_utc,
                OrderState.code.in_(pending_states),
            )
        )
        pending_count = int((await self.session.execute(pending_stmt)).scalar_one())
        return {
            "gross_revenue": Decimal(revenue_row[0] or 0),
            "counted_orders": int(revenue_row[1] or 0),
            "pending_count": pending_count,
        }

    async def get_sales_by_period(self, *, from_utc: datetime, to_utc: datetime) -> list[tuple[datetime, Decimal, int]]:
        stmt = (
            select(
                Payment.created_at,
                func.coalesce(func.sum(OrderItem.line_total), 0),
                func.count(distinct(Order.id)),
            )
            .join(Order, Order.id == Payment.order_id)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(PaymentStatus, PaymentStatus.id == Payment.status_id)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                PaymentStatus.code == "APPROVED",
                OrderState.code.in_(REVENUE_ELIGIBLE_ORDER_STATES),
                Payment.created_at >= from_utc,
                Payment.created_at <= to_utc,
            )
            .group_by(Payment.created_at, Order.id)
            .order_by(Payment.created_at.asc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [(row[0], Decimal(row[1] or 0), int(row[2] or 0)) for row in rows]

    async def get_top_products(self, *, from_utc: datetime, to_utc: datetime, limit: int) -> list[tuple[int | None, str | None, str, int, Decimal, int]]:
        stmt = (
            select(
                OrderItem.product_id,
                OrderItem.product_slug,
                OrderItem.product_name,
                func.coalesce(func.sum(OrderItem.quantity), 0),
                func.coalesce(func.sum(OrderItem.line_total), 0),
                func.count(distinct(Order.id)),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(Payment, Payment.order_id == Order.id)
            .join(PaymentStatus, PaymentStatus.id == Payment.status_id)
            .where(
                PaymentStatus.code == "APPROVED",
                OrderState.code.in_(REVENUE_ELIGIBLE_ORDER_STATES),
                Payment.created_at >= from_utc,
                Payment.created_at <= to_utc,
            )
            .group_by(OrderItem.product_id, OrderItem.product_slug, OrderItem.product_name)
            .order_by(func.sum(OrderItem.line_total).desc(), func.sum(OrderItem.quantity).desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        return [(row[0], row[1], row[2], int(row[3] or 0), Decimal(row[4] or 0), int(row[5] or 0)) for row in rows]

    async def get_orders_by_state(self, *, from_utc: datetime, to_utc: datetime) -> dict[str, int]:
        stmt = (
            select(OrderState.code, func.count(Order.id))
            .select_from(OrderState)
            .join(
                Order,
                and_(
                    Order.state_id == OrderState.id,
                    Order.created_at >= from_utc,
                    Order.created_at <= to_utc,
                ),
                isouter=True,
            )
            .group_by(OrderState.code)
        )
        rows = (await self.session.execute(stmt)).all()
        return {row[0]: int(row[1] or 0) for row in rows}
