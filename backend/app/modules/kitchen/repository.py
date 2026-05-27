from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.orders.model import Order, OrderHistory, OrderItem, OrderState

KITCHEN_VISIBLE_STATE_CODES = ("CONFIRMADO", "EN_PREPARACION")


class KitchenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_queue_rows(self) -> list[tuple[Order, OrderState, datetime]]:
        kitchen_entry_subquery = (
            select(
                OrderHistory.order_id.label("order_id"),
                func.min(OrderHistory.created_at).label("kitchen_entered_at"),
            )
            .join(OrderState, OrderState.id == OrderHistory.to_state_id)
            .where(OrderState.code == "CONFIRMADO")
            .group_by(OrderHistory.order_id)
            .subquery()
        )

        result = await self.session.execute(
            select(Order, OrderState, kitchen_entry_subquery.c.kitchen_entered_at)
            .join(OrderState, OrderState.id == Order.state_id)
            .join(kitchen_entry_subquery, kitchen_entry_subquery.c.order_id == Order.id)
            .where(OrderState.code.in_(KITCHEN_VISIBLE_STATE_CODES))
            .order_by(kitchen_entry_subquery.c.kitchen_entered_at.asc(), Order.id.asc())
        )
        return list(result.all())

    async def list_items_by_order_ids(self, order_ids: list[int]) -> dict[int, list[OrderItem]]:
        if not order_ids:
            return {}
        result = await self.session.execute(
            select(OrderItem)
            .where(OrderItem.order_id.in_(order_ids))
            .order_by(OrderItem.order_id.asc(), OrderItem.id.asc())
        )
        grouped: dict[int, list[OrderItem]] = {order_id: [] for order_id in order_ids}
        for item in result.scalars().all():
            grouped.setdefault(item.order_id, []).append(item)
        return grouped

    async def get_kitchen_entered_at(self, *, order_id: int) -> datetime | None:
        result = await self.session.execute(
            select(func.min(OrderHistory.created_at))
            .select_from(OrderHistory)
            .join(OrderState, OrderState.id == OrderHistory.to_state_id)
            .where(OrderHistory.order_id == order_id, OrderState.code == "CONFIRMADO")
        )
        return result.scalar_one_or_none()
