import json
from datetime import UTC, datetime

import structlog

from app.core.config import Settings, get_settings
from app.core.time import to_utc_iso, utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.orders.model import OrderHistory
from app.modules.payments.errors import (
    payment_already_exists,
    payment_not_found,
    payment_order_not_found,
    payment_order_not_owned,
    payment_order_not_pending,
    payment_preference_creation_failed,
)
from app.modules.payments.gateway import MercadoPagoPort
from app.modules.payments.mercadopago_adapter import MercadoPagoAdapter, MockMercadoPagoAdapter
from app.modules.payments.model import Payment, PaymentEvent
from app.modules.payments.schemas import (
    PaymentInitResponse,
    PaymentRetryResponse,
    PaymentStatusResponse,
    PaymentWebhookPayload,
)

logger = structlog.get_logger("payment_service")


def _build_back_urls(settings: Settings, external_reference: str) -> dict:
    """Build MercadoPago back URLs pointing to the frontend payment result page."""
    base = settings.mp_frontend_url.rstrip("/")
    return {
        "success": f"{base}/payment/result?external_reference={external_reference}",
        "failure": f"{base}/payment/result?external_reference={external_reference}",
        "pending": f"{base}/payment/result?external_reference={external_reference}",
    }


class PaymentService:
    def __init__(self, gateway: MercadoPagoPort | None = None) -> None:
        self._gateway = gateway

    def _get_gateway(self) -> MercadoPagoPort:
        if self._gateway is not None:
            return self._gateway
        settings = get_settings()
        if settings.environment == "testing" or settings.mp_access_token.startswith("TEST"):
            self._gateway = MockMercadoPagoAdapter()
        else:
            self._gateway = MercadoPagoAdapter(settings)
        return self._gateway

    async def init_payment(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        order_id: int,
    ) -> PaymentInitResponse:
        async with uow:
            order = await uow.orders.get_by_id(order_id)
            if order is None:
                raise payment_order_not_found()
            if order.user_id != user_id:
                raise payment_order_not_owned()

            pending_state = await uow.order_states.get_by_code("PENDIENTE")
            if pending_state is None or order.state_id != pending_state.id:
                raise payment_order_not_pending()

            existing_payment = await uow.payments.get_by_order_id(order_id)
            if existing_payment is not None:
                pending_status = await uow.payment_statuses.get_by_code("PENDING")
                if pending_status and existing_payment.status_id == pending_status.id:
                    # return existing preference
                    gateway = self._get_gateway()
                    settings = get_settings()
                    external_reference = existing_payment.mp_external_reference or f"order-{order.id}"
                    back_urls = _build_back_urls(settings, external_reference)

                    mp_result = await gateway.create_preference(
                        external_reference=external_reference,
                        items=[{
                            "title": f"Pedido {order.order_number}",
                            "quantity": 1,
                            "unit_price": float(order.subtotal),
                            "currency_id": "ARS",
                        }],
                        back_urls=back_urls,
                        notification_url=settings.mp_notification_url,
                    )
                    if mp_result.success:
                        existing_payment.mp_preference_id = mp_result.preference_id
                        await uow.session.flush()
                        return PaymentInitResponse(
                            payment_id=existing_payment.id,
                            preference_id=mp_result.preference_id,
                            init_point=mp_result.init_point or "",
                            sandbox_init_point=mp_result.sandbox_init_point,
                            external_reference=external_reference,
                        )
                raise payment_already_exists()

            # resolve payment method
            payment_method = None
            if order.payment_method_id:
                payment_method = await uow.payment_methods.get_by_id(order.payment_method_id)

            pending_status = await uow.payment_statuses.get_by_code("PENDING")
            if pending_status is None:
                raise RuntimeError("PENDING payment status not found in seed data")

            idempotency_key = Payment.generate_idempotency_key()
            external_reference = f"order-{order.id}"

            # build preference
            gateway = self._get_gateway()
            settings = get_settings()
            back_urls = _build_back_urls(settings, external_reference)

            mp_result = await gateway.create_preference(
                external_reference=external_reference,
                items=[{
                    "title": f"Pedido {order.order_number}",
                    "quantity": 1,
                    "unit_price": float(order.subtotal),
                    "currency_id": "ARS",
                }],
                back_urls=back_urls,
                notification_url=settings.mp_notification_url,
            )

            if not mp_result.success:
                logger.error("payment.preference_failed", order_id=order_id, error=mp_result.error)
                raise payment_preference_creation_failed()

            # create payment record
            payment = Payment(
                order_id=order.id,
                payment_method_id=payment_method.id if payment_method else 1,
                status_id=pending_status.id,
                mp_preference_id=mp_result.preference_id,
                mp_external_reference=external_reference,
                amount=order.subtotal,
                currency="ARS",
                idempotency_key=idempotency_key,
                attempts=1,
            )
            payment = await uow.payments.create(payment)

            # create event
            now = utc_now()
            event = PaymentEvent(
                payment_id=payment.id,
                event_type="payment.created",
                raw_payload=json.dumps({
                    "preference_id": mp_result.preference_id,
                    "external_reference": external_reference,
                    "amount": str(order.subtotal),
                }),
                processed=True,
                created_at=now,
            )
            await uow.payment_events.create(event)

            logger.info("payment.created", payment_id=payment.id, order_id=order_id, preference_id=mp_result.preference_id)

            return PaymentInitResponse(
                payment_id=payment.id,
                preference_id=mp_result.preference_id,
                init_point=mp_result.init_point or "",
                sandbox_init_point=mp_result.sandbox_init_point,
                external_reference=external_reference,
            )

    async def retry_payment(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payment_id: int,
    ) -> PaymentRetryResponse:
        async with uow:
            payment = await uow.payments.get_by_id(payment_id)
            if payment is None:
                raise payment_not_found()

            order = await uow.orders.get_by_id(payment.order_id)
            if order is None:
                raise payment_order_not_found()
            if order.user_id != user_id:
                raise payment_order_not_owned()

            # allow retry for FAILED, REJECTED, or PENDING
            failed_status = await uow.payment_statuses.get_by_code("FAILED")
            rejected_status = await uow.payment_statuses.get_by_code("REJECTED")
            pending_status = await uow.payment_statuses.get_by_code("PENDING")

            is_retryable = (
                (failed_status and payment.status_id == failed_status.id)
                or (rejected_status and payment.status_id == rejected_status.id)
                or (pending_status and payment.status_id == pending_status.id)
            )
            if not is_retryable:
                raise payment_order_not_pending()

            if pending_status is None:
                raise RuntimeError("PENDING payment status not found in seed data")

            gateway = self._get_gateway()
            settings = get_settings()
            external_reference = payment.mp_external_reference or f"order-{order.id}"
            back_urls = _build_back_urls(settings, external_reference)

            mp_result = await gateway.create_preference(
                external_reference=external_reference,
                items=[{
                    "title": f"Pedido {order.order_number}",
                    "quantity": 1,
                    "unit_price": float(order.subtotal),
                    "currency_id": "ARS",
                }],
                back_urls=back_urls,
                notification_url=settings.mp_notification_url,
            )

            if not mp_result.success:
                logger.error("payment.retry_failed", payment_id=payment_id, error=mp_result.error)
                raise payment_preference_creation_failed()

            payment.mp_preference_id = mp_result.preference_id
            payment.status_id = pending_status.id
            payment.attempts += 1
            payment.failure_reason = None
            await uow.session.flush()

            now = utc_now()
            event = PaymentEvent(
                payment_id=payment.id,
                event_type="payment.retried",
                raw_payload=json.dumps({
                    "preference_id": mp_result.preference_id,
                    "attempt": payment.attempts,
                }),
                processed=True,
                created_at=now,
            )
            await uow.payment_events.create(event)

            logger.info("payment.retried", payment_id=payment_id, attempt=payment.attempts)

            return PaymentRetryResponse(
                payment_id=payment.id,
                preference_id=mp_result.preference_id,
                init_point=mp_result.init_point or "",
                sandbox_init_point=mp_result.sandbox_init_point,
                attempts=payment.attempts,
            )

    async def get_payment_status(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        payment_id: int,
    ) -> PaymentStatusResponse:
        async with uow:
            payment = await uow.payments.get_by_id(payment_id)
            if payment is None:
                raise payment_not_found()

            order = await uow.orders.get_by_id(payment.order_id)
            if order is None or order.user_id != user_id:
                raise payment_not_found()

            await self._sync_pending_payment(uow, payment=payment)

            status = await uow.payment_statuses.get_by_id(payment.status_id)
            return PaymentStatusResponse.from_model(
                payment,
                status_name=status.name if status else "UNKNOWN",
                created_at=to_utc_iso(payment.created_at),
                updated_at=to_utc_iso(payment.updated_at),
            )

    async def get_payment_by_order(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        user_id: int,
        order_id: int,
    ) -> PaymentStatusResponse:
        async with uow:
            order = await uow.orders.get_by_id(order_id)
            if order is None or order.user_id != user_id:
                raise payment_not_found()

            payment = await uow.payments.get_by_order_id(order_id)
            if payment is None:
                raise payment_not_found()

            return await self._build_payment_status_response(uow, payment=payment)

    async def get_payment_by_external_reference(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        external_reference: str,
    ) -> PaymentStatusResponse:
        async with uow:
            payment = await uow.payments.get_by_external_reference(external_reference)
            if payment is None:
                raise payment_not_found()

            return await self._build_payment_status_response(uow, payment=payment)

    async def _build_payment_status_response(self, uow: SqlAlchemyUnitOfWork, *, payment: Payment) -> PaymentStatusResponse:
        await self._sync_pending_payment(uow, payment=payment)

        status = await uow.payment_statuses.get_by_id(payment.status_id)
        return PaymentStatusResponse.from_model(
            payment,
            status_name=status.name if status else "UNKNOWN",
            created_at=to_utc_iso(payment.created_at),
            updated_at=to_utc_iso(payment.updated_at),
        )

    async def _sync_pending_payment(self, uow: SqlAlchemyUnitOfWork, *, payment: Payment) -> None:
        pending_status = await uow.payment_statuses.get_by_code("PENDING")
        if pending_status is None or payment.status_id != pending_status.id:
            return

        gateway = self._get_gateway()
        real_status = None

        if payment.mp_payment_id:
            real_status = await gateway.get_payment_status(payment.mp_payment_id)
        elif payment.mp_external_reference:
            real_status = await gateway.search_payment_by_external_reference(payment.mp_external_reference)

        if real_status is None or not real_status.success or real_status.mp_payment_id is None:
            return

        await self._apply_payment_status(
            uow,
            payment=payment,
            mp_status=real_status.status,
            mp_payment_id=real_status.mp_payment_id,
        )
        await uow.session.flush()

    async def process_webhook(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        payload: PaymentWebhookPayload,
    ) -> None:
        """Process MercadoPago webhook notification.

        Webhooks are treated as untrusted signals:
        1. Log the event immediately
        2. Consult real status from MercadoPago
        3. Update payment and order state only after confirmation
        """
        async with uow:
            if payload.type != "payment":
                logger.info("webhook.ignored", type=payload.type)
                return

            mp_payment_id = None
            if payload.data and isinstance(payload.data, dict):
                mp_payment_id = payload.data.get("id")
            if mp_payment_id is None and payload.id:
                mp_payment_id = str(payload.id)

            if mp_payment_id is None:
                logger.warning("webhook.no_payment_id", payload=payload.model_dump())
                return

            mp_payment_id = str(mp_payment_id)
            logger.info("webhook.received", mp_payment_id=mp_payment_id)

            # look up payment by mp_payment_id first, then by external_reference
            payment = await uow.payments.get_by_mp_payment_id(mp_payment_id)
            if payment is None:
                # try to find by external_reference from the webhook payload
                external_ref = None
                if payload.data and isinstance(payload.data, dict):
                    external_ref = payload.data.get("external_reference")
                if external_ref:
                    payment = await uow.payments.get_by_external_reference(external_ref)

            if payment is None:
                logger.warning("webhook.payment_not_found", mp_payment_id=mp_payment_id)
                return

            now = utc_now()
            event = PaymentEvent(
                payment_id=payment.id,
                event_type=f"webhook.{payload.type}",
                raw_payload=payload.model_dump_json(),
                processed=False,
                created_at=now,
            )
            await uow.payment_events.create(event)
            await uow.session.flush()

            gateway = self._get_gateway()
            real_status = await gateway.get_payment_status(mp_payment_id)

            if not real_status.success:
                logger.error("webhook.consult_failed", mp_payment_id=mp_payment_id, error=real_status.error)
                return

            await self._apply_payment_status(uow, payment=payment, mp_status=real_status.status, mp_payment_id=mp_payment_id)

            event.processed = True
            await uow.session.flush()

            logger.info("webhook.processed", mp_payment_id=mp_payment_id, status=real_status.status)

    async def sync_payment_status(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        payment_id: int,
    ) -> None:
        """Manually sync payment status with MercadoPago."""
        async with uow:
            payment = await uow.payments.get_by_id(payment_id)
            if payment is None:
                raise payment_not_found()

            if payment.mp_payment_id is None:
                return

            gateway = self._get_gateway()
            real_status = await gateway.get_payment_status(payment.mp_payment_id)

            if not real_status.success:
                logger.error("sync.consult_failed", payment_id=payment_id, error=real_status.error)
                return

            await self._apply_payment_status(uow, payment=payment, mp_status=real_status.status, mp_payment_id=payment.mp_payment_id)
            await uow.session.flush()

    async def _apply_payment_status(
        self,
        uow: SqlAlchemyUnitOfWork,
        *,
        payment: Payment,
        mp_status: str | None,
        mp_payment_id: str,
    ) -> None:
        """Apply MercadoPago status to local payment and order."""
        payment.mp_payment_id = mp_payment_id

        status_map = {
            "approved": "APPROVED",
            "pending": "PENDING",
            "authorized": "AUTHORIZED",
            "in_process": "IN_PROCESS",
            "in_mediation": "IN_MEDIATION",
            "rejected": "REJECTED",
            "cancelled": "CANCELLED",
            "refunded": "REFUNDED",
            "charged_back": "CHARGED_BACK",
        }

        local_status_code = status_map.get(mp_status, "PENDING")
        new_status = await uow.payment_statuses.get_by_code(local_status_code)

        if new_status is None:
            logger.warning("payment.unknown_status", mp_status=mp_status, mapped=local_status_code)
            return

        old_status_id = payment.status_id
        payment.status_id = new_status.id

        if local_status_code in ("REJECTED", "CANCELLED"):
            payment.failure_reason = f"MercadoPago status: {mp_status}"

        if local_status_code == "APPROVED":
            order = await uow.orders.get_by_id(payment.order_id)
            if order:
                confirmed_state = await uow.order_states.get_by_code("CONFIRMADO")
                if confirmed_state and order.state_id != confirmed_state.id:
                    old_state_id = order.state_id
                    order.state_id = confirmed_state.id
                    await uow.session.flush()

                    history = OrderHistory(
                        order_id=order.id,
                        from_state_id=old_state_id,
                        to_state_id=confirmed_state.id,
                        changed_by_user_id=None,
                        note=f"Pago aprobado (MP payment: {mp_payment_id})",
                        created_at=utc_now(),
                    )
                    await uow.order_history.create(history)
                    logger.info("order.confirmed", order_id=order.id, payment_id=payment.id)


def get_payment_service() -> PaymentService:
    return PaymentService()


payment_service = PaymentService()
