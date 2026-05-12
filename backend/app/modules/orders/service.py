import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select

from app.core.time import utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.orders.errors import (
    order_delivery_address_not_found,
    order_delivery_address_required,
    order_forbidden_transition,
    order_empty_cart,
    order_insufficient_stock,
    order_invalid_customization,
    order_invalid_quantity,
    order_not_found,
    order_payment_method_not_found,
    order_product_not_found,
)
from app.modules.orders.fsm import ActorType, TransitionRequest, can_transition
from app.modules.orders.model import Order, OrderHistory, OrderItem, OrderState
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderDetailResponse,
    OrderHistoryResponse,
    OrderListPageResponse,
    OrderListResponse,
    PaymentSummaryResponse,
    OrderResponse,
)


class OrderService:
    async def _transition_order_in_uow(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        order_id: int,
        to_code: str,
        actor_type: ActorType,
        actor_user_id: int | None,
        source: str,
        reason_code: str | None,
        note: str | None,
        event_key: str | None,
    ) -> OrderResponse:
        order = await uow.orders.get_by_id_for_update(order_id=order_id)
        if order is None:
            raise order_not_found()

        if actor_type == "customer" and actor_user_id != order.user_id:
            raise order_forbidden_transition(actor_type="customer", from_state="UNKNOWN", to_state=to_code)

        if event_key:
            existing = await uow.order_history.get_history_by_event_key(event_key=event_key)
            if existing:
                items = await uow.order_items.list_by_order(order_id=order.id)
                current_state = await uow.order_states.get_by_id(order.state_id)
                payment_method = await uow.payment_methods.get_by_id(order.payment_method_id) if order.payment_method_id else None
                return OrderResponse.from_model(
                    order,
                    items=items,
                    state_name=current_state.name if current_state else "UNKNOWN",
                    payment_method_name=payment_method.name if payment_method else None,
                )

        current_state = await uow.order_states.get_by_id(order.state_id)
        if current_state is None:
            raise RuntimeError("Current order state not found")
        target_state = await uow.order_states.get_by_code(to_code)
        if target_state is None:
            raise RuntimeError(f"Target order state '{to_code}' not found")

        can_transition(
            TransitionRequest(
                from_code=current_state.code,
                to_code=target_state.code,
                actor_type=actor_type,
                is_owner=actor_user_id == order.user_id,
                source=source,
            )
        )

        order.state_id = target_state.id
        if target_state.code == "CANCELADO":
            await self._restore_stock(uow, order_id=order.id)

        history = OrderHistory(
            order_id=order.id,
            from_state_id=current_state.id,
            to_state_id=target_state.id,
            changed_by_user_id=actor_user_id,
            actor_type=actor_type,
            source=source,
            reason_code=reason_code,
            note=note,
            event_key=event_key,
            created_at=utc_now(),
        )
        await uow.order_history.create(history)

        items = await uow.order_items.list_by_order(order_id=order.id)
        payment_method = await uow.payment_methods.get_by_id(order.payment_method_id) if order.payment_method_id else None
        return OrderResponse.from_model(
            order,
            items=items,
            state_name=target_state.name,
            payment_method_name=payment_method.name if payment_method else None,
        )

    async def transition_order(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        order_id: int,
        to_code: str,
        actor_type: ActorType,
        actor_user_id: int | None,
        source: str,
        reason_code: str | None,
        note: str | None,
        event_key: str | None,
    ) -> OrderResponse:
        async with uow:
            return await self._transition_order_in_uow(
                uow,
                order_id=order_id,
                to_code=to_code,
                actor_type=actor_type,
                actor_user_id=actor_user_id,
                source=source,
                reason_code=reason_code,
                note=note,
                event_key=event_key,
            )

    async def create_order(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payload: OrderCreateRequest,
    ) -> OrderResponse:
        if not payload.items:
            raise order_empty_cart()

        async with uow:
            # resolve delivery address
            address = await self._resolve_address(uow, user_id=user_id, delivery_address_id=payload.delivery_address_id)

            # resolve payment method
            payment_method = None
            if payload.payment_method_code:
                payment_method = await uow.payment_methods.get_by_code(payload.payment_method_code)
                if payment_method is None:
                    raise order_payment_method_not_found()

            # get initial state
            pending_state = await uow.order_states.get_by_code("PENDIENTE")
            if pending_state is None:
                raise RuntimeError("PENDIENTE order state not found in seed data")

            # validate items and build snapshots
            subtotal = Decimal("0.00")
            item_snapshots: list[dict] = []

            for index, line in enumerate(payload.items):
                if not isinstance(line.quantity, int) or line.quantity < 1:
                    raise order_invalid_quantity(line_index=index)

                product = await uow.products.get_by_id(line.product_id)
                if (
                    product is None
                    or product.deleted_at is not None
                    or not product.is_active
                    or not product.is_available
                ):
                    raise order_product_not_found()

                if product.stock_quantity < line.quantity:
                    raise order_insufficient_stock(line_index=index, product_id=line.product_id)

                # validate customizations
                ingredients = await uow.products.list_ingredients_for_product(product.id)
                ingredient_map = {ingredient.id: (ingredient.name, is_removable) for ingredient, is_removable in ingredients}
                removed_names: list[str] = []
                for ingredient_id in sorted(set(line.removed_ingredient_ids)):
                    ingredient = ingredient_map.get(ingredient_id)
                    if ingredient is None or not ingredient[1]:
                        raise order_invalid_customization(line_index=index)
                    removed_names.append(ingredient[0])

                line_total = product.price * Decimal(line.quantity)
                subtotal += line_total

                item_snapshots.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "product_slug": product.slug,
                    "unit_price": product.price,
                    "quantity": line.quantity,
                    "line_total": line_total,
                    "removed_ingredients": ", ".join(removed_names),
                })

            # decrement stock atomically
            for snapshot in item_snapshots:
                product = await uow.products.get_by_id(snapshot["product_id"])
                product.stock_quantity -= snapshot["quantity"]
                await uow.session.flush()

            # generate unique order number
            order_number = self._generate_order_number()

            # create order with address snapshot
            order = Order(
                user_id=user_id,
                state_id=pending_state.id,
                payment_method_id=payment_method.id if payment_method else None,
                order_number=order_number,
                delivery_recipient_name=address.recipient_name,
                delivery_phone=address.phone,
                delivery_street=address.street,
                delivery_street_number=address.street_number,
                delivery_floor=address.floor,
                delivery_apartment=address.apartment,
                delivery_city=address.city,
                delivery_province=address.province,
                delivery_postal_code=address.postal_code,
                delivery_reference=address.reference,
                subtotal=subtotal,
                notes=payload.notes,
            )
            order = await uow.orders.create(order)

            # create order items with product snapshots
            for snapshot in item_snapshots:
                item = OrderItem(
                    order_id=order.id,
                    product_id=snapshot["product_id"],
                    product_name=snapshot["product_name"],
                    product_slug=snapshot["product_slug"],
                    unit_price=snapshot["unit_price"],
                    quantity=snapshot["quantity"],
                    line_total=snapshot["line_total"],
                    removed_ingredients=snapshot["removed_ingredients"],
                )
                await uow.order_items.create(item)

            # create initial history entry via FSM policy
            can_transition(
                TransitionRequest(
                    from_code=None,
                    to_code="PENDIENTE",
                    actor_type="customer",
                    is_owner=True,
                    source="api",
                )
            )
            history = OrderHistory(
                order_id=order.id,
                from_state_id=None,
                to_state_id=pending_state.id,
                changed_by_user_id=user_id,
                actor_type="customer",
                source="api",
                reason_code="order_created",
                note="Pedido creado",
                event_key=f"order:{order.id}:created",
                created_at=utc_now(),
            )
            await uow.order_history.create(history)

            # load items for response
            items = await uow.order_items.list_by_order(order_id=order.id)

            return OrderResponse.from_model(
                order,
                items=items,
                state_name=pending_state.name,
                payment_method_name=payment_method.name if payment_method else None,
            )

    async def get_order(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        order_id: int,
    ) -> OrderDetailResponse:
        async with uow:
            order = await uow.orders.get_by_id_for_user(order_id=order_id, user_id=user_id)
            if order is None:
                raise order_not_found()

            items = await uow.order_items.list_by_order(order_id=order.id)
            state = await uow.order_states.get_by_id(order.state_id)
            payment_method = None
            if order.payment_method_id:
                payment_method = await uow.payment_methods.get_by_id(order.payment_method_id)

            base_response = OrderResponse.from_model(
                order,
                items=items,
                state_name=state.name if state else "UNKNOWN",
                payment_method_name=payment_method.name if payment_method else None,
            )

            state_result = await uow.session.execute(select(OrderState))
            state_entries = list(state_result.scalars().all())
            state_map = {entry.id: entry.name for entry in state_entries}
            history_rows = await uow.order_history.list_by_order(order_id=order.id)

            latest_payment = await uow.payments.get_by_order_id(order.id)
            payment_summary = None
            if latest_payment is not None:
                payment_status = await uow.payment_statuses.get_by_id(latest_payment.status_id)
                status_code = (payment_status.code if payment_status else "").upper()
                retry_allowed = status_code in {"PENDING", "REJECTED", "FAILED"} and (state.code if state else "") == "PENDIENTE"
                payment_summary = PaymentSummaryResponse(
                    payment_id=latest_payment.id,
                    status=payment_status.name if payment_status else "UNKNOWN",
                    amount=f"{latest_payment.amount:.2f}",
                    attempts=latest_payment.attempts,
                    failure_reason=latest_payment.failure_reason,
                    retry_allowed=retry_allowed,
                )

            return OrderDetailResponse(
                **base_response.model_dump(),
                payment=payment_summary,
                history=[OrderHistoryResponse.from_model(row, state_map=state_map) for row in history_rows],
            )

    async def list_orders(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        state_code: str | None,
        skip: int,
        limit: int,
    ) -> OrderListPageResponse:
        async with uow:
            orders = await uow.orders.list_by_user_paginated(user_id=user_id, state_code=state_code, skip=skip, limit=limit)
            total = await uow.orders.count_by_user(user_id=user_id, state_code=state_code)
            result: list[OrderListResponse] = []
            for order in orders:
                state = await uow.order_states.get_by_id(order.state_id)
                items = await uow.order_items.list_by_order(order_id=order.id)
                result.append(
                    OrderListResponse.from_model(
                        order,
                        state_name=state.name if state else "UNKNOWN",
                        item_count=len(items),
                    )
                )
            return OrderListPageResponse(items=result, total=total, skip=skip, limit=limit)

    async def _resolve_address(self, uow: SqlAlchemyUnitOfWork, *, user_id: int, delivery_address_id: int | None):
        if delivery_address_id is not None:
            address = await uow.delivery_addresses.get_by_id_for_user(address_id=delivery_address_id, user_id=user_id)
            if address is None:
                raise order_delivery_address_not_found()
            return address

        addresses = await uow.delivery_addresses.list_by_user(user_id=user_id)
        default_address = next((address for address in addresses if address.is_default), None)
        if default_address is None:
            raise order_delivery_address_required()
        return default_address

    def _generate_order_number(self) -> str:
        timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        short_uuid = uuid.uuid4().hex[:6].upper()
        return f"ORD-{timestamp}-{short_uuid}"

    async def _restore_stock(self, uow: SqlAlchemyUnitOfWork, *, order_id: int) -> None:
        items = await uow.order_items.list_by_order(order_id=order_id)
        product_ids = sorted({item.product_id for item in items})
        item_quantity_map: dict[int, int] = {}
        for item in items:
            item_quantity_map[item.product_id] = item_quantity_map.get(item.product_id, 0) + item.quantity
        products = await uow.products.list_by_ids_for_update(product_ids)
        for product in products:
            product.stock_quantity += item_quantity_map[product.id]
        await uow.session.flush()


order_service = OrderService()
