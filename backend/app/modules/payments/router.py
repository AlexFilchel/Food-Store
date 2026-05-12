from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, Response, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.identity.model import User
from app.modules.payments.schemas import (
    PaymentInitRequest,
    PaymentInitResponse,
    PaymentRetryResponse,
    PaymentStatusResponse,
    PaymentWebhookPayload,
)
from app.modules.payments.service import payment_service

logger = structlog.get_logger("payments_router")

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/init", response_model=PaymentInitResponse, status_code=status.HTTP_201_CREATED)
async def init_payment(
    payload: PaymentInitRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PaymentInitResponse:
    return await payment_service.init_payment(uow, user_id=current_user.id, order_id=payload.order_id)


@router.get("/{payment_id}/status", response_model=PaymentStatusResponse)
async def get_payment_status(
    payment_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PaymentStatusResponse:
    return await payment_service.get_payment_status(uow, user_id=current_user.id, payment_id=payment_id)


@router.get("/by-order/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_by_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PaymentStatusResponse:
    return await payment_service.get_payment_by_order(uow, user_id=current_user.id, order_id=order_id)


@router.get("/result/{external_reference}", response_model=PaymentStatusResponse)
async def get_payment_result_by_external_reference(
    external_reference: str,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PaymentStatusResponse:
    return await payment_service.get_payment_by_external_reference(uow, external_reference=external_reference)


@router.post("/{payment_id}/retry", response_model=PaymentRetryResponse)
async def retry_payment(
    payment_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> PaymentRetryResponse:
    return await payment_service.retry_payment(uow, user_id=current_user.id, payment_id=payment_id)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def payment_webhook(
    payload: PaymentWebhookPayload,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> Response:
    """MercadoPago webhook notification endpoint.

    Webhooks are treated as untrusted signals:
    1. Respond fast (200 OK)
    2. Log the event
    3. Consult real status from MercadoPago
    4. Update payment/order state only after confirmation
    """
    try:
        await payment_service.process_webhook(uow, payload=payload)
    except Exception:
        logger.exception("webhook.unhandled_error")
    return Response(status_code=status.HTTP_200_OK)
