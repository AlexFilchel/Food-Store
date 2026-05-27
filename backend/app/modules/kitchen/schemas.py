from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.time import to_utc_iso
from app.modules.orders.model import Order, OrderItem, OrderState


class KitchenOrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    removed_ingredients: list[str] = Field(default_factory=list)
    line_total: str

    @classmethod
    def from_model(cls, item: OrderItem) -> "KitchenOrderItemResponse":
        removed = [entry.strip() for entry in item.removed_ingredients.split(",") if entry.strip()]
        return cls(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            removed_ingredients=removed,
            line_total=f"{item.line_total:.2f}",
        )


class KitchenOrderCardResponse(BaseModel):
    id: int
    order_number: str
    state_code: str
    state_display_name: str
    notes: str | None
    kitchen_entered_at: str
    items: list[KitchenOrderItemResponse]

    @classmethod
    def from_values(
        cls,
        *,
        order: Order,
        state: OrderState,
        items: list[OrderItem],
        kitchen_entered_at,
    ) -> "KitchenOrderCardResponse":
        return cls(
            id=order.id,
            order_number=order.order_number,
            state_code=state.code,
            state_display_name=state.name,
            notes=order.notes,
            kitchen_entered_at=to_utc_iso(kitchen_entered_at),
            items=[KitchenOrderItemResponse.from_model(item) for item in items],
        )


class KitchenQueueResponse(BaseModel):
    items: list[KitchenOrderCardResponse]


class KitchenEventResponse(BaseModel):
    type: str
    order_id: int
    occurred_at: str
    order: KitchenOrderCardResponse | None = None
