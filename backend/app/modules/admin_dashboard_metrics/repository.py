from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import and_, distinct, func, select
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.model import Order, OrderItem, OrderState
from app.modules.identity.model import User
from app.modules.payments.model import Payment, PaymentStatus
from app.modules.products.model import ProductCategory
from app.modules.categories.model import Category

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
                Payment.created_at < to_utc,
            )
        )
        revenue_row = (await self.session.execute(revenue_stmt)).one()

        pending_stmt = (
            select(func.count(Order.id))
            .join(OrderState, OrderState.id == Order.state_id)
            .where(
                Order.created_at >= from_utc,
                Order.created_at < to_utc,
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
                Payment.created_at < to_utc,
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
                Payment.created_at < to_utc,
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
                    Order.created_at < to_utc,
                ),
                isouter=True,
            )
            .group_by(OrderState.code)
        )
        rows = (await self.session.execute(stmt)).all()
        return {row[0]: int(row[1] or 0) for row in rows}

    async def get_health_counts(self, *, from_utc: datetime, to_utc: datetime, stuck_minutes: int, now_utc: datetime) -> dict[str, int]:
        pending_stmt = (
            select(func.count(Order.id))
            .join(OrderState, OrderState.id == Order.state_id)
            .where(
                Order.created_at >= from_utc,
                Order.created_at < to_utc,
                OrderState.code == "PENDIENTE",
            )
        )
        cancelled_stmt = (
            select(func.count(Order.id))
            .join(OrderState, OrderState.id == Order.state_id)
            .where(
                Order.created_at >= from_utc,
                Order.created_at < to_utc,
                OrderState.code == "CANCELADO",
            )
        )

        latest_payment_id_sq = (
            select(Payment.order_id, func.max(Payment.id).label("latest_payment_id"))
            .group_by(Payment.order_id)
            .subquery()
        )
        latest_payment = aliased(Payment)

        rejected_stmt = (
            select(func.count(Order.id))
            .join(latest_payment_id_sq, latest_payment_id_sq.c.order_id == Order.id)
            .join(latest_payment, latest_payment.id == latest_payment_id_sq.c.latest_payment_id)
            .join(PaymentStatus, PaymentStatus.id == latest_payment.status_id)
            .where(
                Order.created_at >= from_utc,
                Order.created_at < to_utc,
                PaymentStatus.code == "REJECTED",
            )
        )

        stuck_threshold_utc = now_utc - timedelta(minutes=stuck_minutes)
        stuck_stmt = (
            select(func.count(distinct(Order.id)))
            .join(OrderState, OrderState.id == Order.state_id)
            .join(latest_payment_id_sq, latest_payment_id_sq.c.order_id == Order.id, isouter=True)
            .join(latest_payment, latest_payment.id == latest_payment_id_sq.c.latest_payment_id, isouter=True)
            .join(PaymentStatus, PaymentStatus.id == latest_payment.status_id, isouter=True)
            .where(
                Order.created_at >= from_utc,
                Order.created_at < to_utc,
                OrderState.code == "PENDIENTE",
                Order.created_at <= stuck_threshold_utc,
                ((PaymentStatus.code == "PENDING") | (latest_payment.id.is_(None))),
            )
        )

        pending_count = int((await self.session.execute(pending_stmt)).scalar_one())
        cancelled_count = int((await self.session.execute(cancelled_stmt)).scalar_one())
        rejected_count = int((await self.session.execute(rejected_stmt)).scalar_one())
        stuck_count = int((await self.session.execute(stuck_stmt)).scalar_one())

        return {
            "pending_orders_count": pending_count,
            "cancelled_orders_count": cancelled_count,
            "rejected_payments_count": rejected_count,
            "stuck_orders_count": stuck_count,
        }

    async def get_category_insights(self, *, from_utc: datetime, to_utc: datetime, limit: int) -> list[tuple[int, str, Decimal, int]]:
        stmt = (
            select(
                Category.id,
                Category.name,
                func.coalesce(func.sum(OrderItem.line_total), 0),
                func.count(distinct(Order.id)),
            )
            .join(ProductCategory, ProductCategory.category_id == Category.id)
            .join(OrderItem, OrderItem.product_id == ProductCategory.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(Payment, Payment.order_id == Order.id)
            .join(PaymentStatus, PaymentStatus.id == Payment.status_id)
            .where(
                PaymentStatus.code == "APPROVED",
                OrderState.code.in_(REVENUE_ELIGIBLE_ORDER_STATES),
                Payment.created_at >= from_utc,
                Payment.created_at < to_utc,
            )
            .group_by(Category.id, Category.name)
            .order_by(func.sum(OrderItem.line_total).desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        return [(int(row[0]), str(row[1]), Decimal(row[2] or 0), int(row[3] or 0)) for row in rows]

    async def get_recent_sales(self, *, from_utc: datetime, to_utc: datetime, limit: int) -> list[tuple[int, str, str, Decimal, str, str, datetime]]:
        stmt = (
            select(
                Order.id,
                Order.order_number,
                User.full_name,
                Payment.amount,
                OrderState.code,
                PaymentStatus.code,
                Payment.created_at,
            )
            .join(User, User.id == Order.user_id)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(Payment, Payment.order_id == Order.id)
            .join(PaymentStatus, PaymentStatus.id == Payment.status_id)
            .where(
                PaymentStatus.code == "APPROVED",
                Payment.created_at >= from_utc,
                Payment.created_at < to_utc,
            )
            .order_by(Payment.created_at.desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            (int(row[0]), str(row[1]), str(row[2]), Decimal(row[3] or 0), str(row[4]), str(row[5]), row[6])
            for row in rows
        ]
