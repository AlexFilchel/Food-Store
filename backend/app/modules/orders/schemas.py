from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.time import to_utc_iso
from app.modules.orders.model import Order, OrderHistory, OrderItem


class OrderItemCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1)
    removed_ingredient_ids: list[int] = Field(default_factory=list)


class OrderCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OrderItemCreateRequest] = Field(min_length=1)
    delivery_address_id: int | None = Field(default=None, ge=1)
    payment_method_code: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=500)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    unit_price: str
    quantity: int
    line_total: str
    removed_ingredients: list[str]

    @classmethod
    def from_model(cls, item: OrderItem) -> "OrderItemResponse":
        removed = [name.strip() for name in item.removed_ingredients.split(",") if name.strip()]
        return cls(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            product_slug=item.product_slug,
            unit_price=f"{item.unit_price:.2f}",
            quantity=item.quantity,
            line_total=f"{item.line_total:.2f}",
            removed_ingredients=removed,
        )


class OrderHistoryResponse(BaseModel):
    id: int
    from_state: str | None
    to_state: str
    changed_by_user_id: int | None
    actor_type: str | None
    source: str | None
    reason_code: str | None
    note: str | None
    event_key: str | None
    created_at: str

    @classmethod
    def from_model(cls, entry: OrderHistory, *, state_map: dict[int, str]) -> "OrderHistoryResponse":
        return cls(
            id=entry.id,
            from_state=state_map.get(entry.from_state_id) if entry.from_state_id else None,
            to_state=state_map[entry.to_state_id],
            changed_by_user_id=entry.changed_by_user_id,
            actor_type=entry.actor_type,
            source=entry.source,
            reason_code=entry.reason_code,
            note=entry.note,
            event_key=entry.event_key,
            created_at=to_utc_iso(entry.created_at) if isinstance(entry.created_at, datetime) else entry.created_at,
        )


class OrderCancelRequest(BaseModel):
    reason_code: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)


class OrderTransitionRequest(BaseModel):
    to_state_code: str = Field(min_length=3, max_length=50)
    reason_code: str | None = Field(default=None, max_length=80)
    note: str | None = Field(default=None, max_length=500)


class OrderDeliveryAddressResponse(BaseModel):
    recipient_name: str
    phone: str
    street: str
    street_number: str
    floor: str | None
    apartment: str | None
    city: str
    province: str
    postal_code: str
    reference: str | None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    state: str
    payment_method: str | None
    delivery_address: OrderDeliveryAddressResponse
    items: list[OrderItemResponse]
    subtotal: str
    notes: str | None
    created_at: str
    updated_at: str

    @classmethod
    def from_model(
        cls,
        order: Order,
        *,
        items: list[OrderItem],
        state_name: str,
        payment_method_name: str | None,
    ) -> "OrderResponse":
        return cls(
            id=order.id,
            order_number=order.order_number,
            state=state_name,
            payment_method=payment_method_name,
            delivery_address=OrderDeliveryAddressResponse(
                recipient_name=order.delivery_recipient_name,
                phone=order.delivery_phone,
                street=order.delivery_street,
                street_number=order.delivery_street_number,
                floor=order.delivery_floor,
                apartment=order.delivery_apartment,
                city=order.delivery_city,
                province=order.delivery_province,
                postal_code=order.delivery_postal_code,
                reference=order.delivery_reference,
            ),
            items=[OrderItemResponse.from_model(item) for item in items],
            subtotal=f"{order.subtotal:.2f}",
            notes=order.notes,
            created_at=to_utc_iso(order.created_at),
            updated_at=to_utc_iso(order.updated_at),
        )


class OrderListResponse(BaseModel):
    id: int
    order_number: str
    state: str
    item_count: int
    subtotal: str
    created_at: str

    @classmethod
    def from_model(cls, order: Order, *, state_name: str, item_count: int) -> "OrderListResponse":
        return cls(
            id=order.id,
            order_number=order.order_number,
            state=state_name,
            item_count=item_count,
            subtotal=f"{order.subtotal:.2f}",
            created_at=to_utc_iso(order.created_at),
        )


class PaymentSummaryResponse(BaseModel):
    payment_id: int
    status: str
    amount: str
    attempts: int
    failure_reason: str | None
    retry_allowed: bool


class OrderDetailResponse(OrderResponse):
    payment: PaymentSummaryResponse | None = None
    history: list[OrderHistoryResponse] = Field(default_factory=list)


class OrderListPageResponse(BaseModel):
    items: list[OrderListResponse]
    total: int
    skip: int
    limit: int


class OperationsOrderFilters(BaseModel):
    model_config = ConfigDict(extra="ignore")

    state_code: str | None = Field(default=None, max_length=50)
    date_from: datetime | None = None
    date_to: datetime | None = None
    customer: str | None = Field(default=None, max_length=160)
    payment_status_code: str | None = Field(default=None, max_length=50)
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class OperationsOrderListItemResponse(BaseModel):
    id: int
    order_number: str
    state_code: str
    state: str
    customer_name: str
    customer_email: str
    payment_status: str | None
    payment_status_code: str | None
    subtotal: str
    created_at: str


class OperationsOrderListPageResponse(BaseModel):
    items: list[OperationsOrderListItemResponse]
    total: int
    skip: int
    limit: int


class OperationsOrderResponse(BaseModel):
    id: int
    order_number: str
    state_code: str
    state: str
    payment_method: str | None
    subtotal: str
    notes: str | None
    created_at: str
    updated_at: str


class OperationsOrderCustomerResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str


class OperationsPaymentSummaryResponse(BaseModel):
    payment_id: int
    status: str
    status_code: str
    amount: str
    attempts: int
    failure_reason: str | None
    retry_allowed: bool
    provider_reference: str | None
    last_synced_at: str | None


class OperationsOrderDetailResponse(BaseModel):
    order: OperationsOrderResponse
    customer: OperationsOrderCustomerResponse
    delivery_address: OrderDeliveryAddressResponse
    items: list[OrderItemResponse]
    payment: OperationsPaymentSummaryResponse | None
    history: list[OrderHistoryResponse]
    allowed_actions: list[str]
