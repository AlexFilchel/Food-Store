from __future__ import annotations

from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.kitchen.schemas import KitchenOrderCardResponse, KitchenQueueResponse


class KitchenService:
    async def list_queue(self, uow: SqlAlchemyUnitOfWork) -> KitchenQueueResponse:
        async with uow:
            rows = await uow.kitchen.list_queue_rows()
            order_ids = [order.id for order, _, _ in rows]
            items_by_order = await uow.kitchen.list_items_by_order_ids(order_ids)

            return KitchenQueueResponse(
                items=[
                    KitchenOrderCardResponse.from_values(
                        order=order,
                        state=state,
                        items=items_by_order.get(order.id, []),
                        kitchen_entered_at=kitchen_entered_at,
                    )
                    for order, state, kitchen_entered_at in rows
                ]
            )


kitchen_service = KitchenService()
