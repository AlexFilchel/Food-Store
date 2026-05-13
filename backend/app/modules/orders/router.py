from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.identity.model import User
from app.modules.orders.schemas import (
    OperationsOrderDetailResponse,
    OperationsOrderFilters,
    OperationsOrderListPageResponse,
    OrderCancelRequest,
    OrderCreateRequest,
    OrderDetailResponse,
    OrderListPageResponse,
    OrderResponse,
    OrderTransitionRequest,
)
from app.modules.orders.service import order_service

router = APIRouter(prefix="/orders", tags=["orders"])
admin_router = APIRouter(prefix="/admin/orders", tags=["admin-orders"], dependencies=[Depends(require_role("ADMIN", "PEDIDOS"))])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderResponse:
    return await order_service.create_order(uow, user_id=current_user.id, payload=payload)


@router.get("", response_model=OrderListPageResponse)
async def list_orders(
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    state_code: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> OrderListPageResponse:
    return await order_service.list_orders(
        uow,
        user_id=current_user.id,
        state_code=state_code,
        skip=skip,
        limit=limit,
    )


@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderDetailResponse:
    return await order_service.get_order(uow, user_id=current_user.id, order_id=order_id)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    payload: OrderCancelRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderResponse:
    return await order_service.transition_order(
        uow,
        order_id=order_id,
        to_code="CANCELADO",
        actor_type="customer",
        actor_user_id=current_user.id,
        source="api",
        reason_code=payload.reason_code,
        note=payload.note,
        event_key=f"order:{order_id}:customer-cancel",
    )


@admin_router.post("/{order_id}/transition", response_model=OperationsOrderDetailResponse)
async def transition_operations_order(
    order_id: int,
    payload: OrderTransitionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OperationsOrderDetailResponse:
    return await order_service.transition_operations_order(
        uow,
        order_id=order_id,
        to_code=payload.to_state_code,
        actor_user_id=current_user.id,
        reason_code=payload.reason_code,
        note=payload.note,
    )


@admin_router.get("", response_model=OperationsOrderListPageResponse)
async def list_operations_orders(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    state_code: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    customer: str | None = None,
    payment_status_code: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> OperationsOrderListPageResponse:
    filters = OperationsOrderFilters(
        state_code=state_code,
        date_from=date_from,
        date_to=date_to,
        customer=customer,
        payment_status_code=payment_status_code,
        skip=skip,
        limit=limit,
    )
    return await order_service.list_operations_orders(uow, filters=filters)


@admin_router.get("/{order_id}", response_model=OperationsOrderDetailResponse)
async def get_operations_order(
    order_id: int,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OperationsOrderDetailResponse:
    return await order_service.get_operations_order(uow, order_id=order_id)
