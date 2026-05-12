from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.identity.model import User
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderCancelRequest,
    OrderDetailResponse,
    OrderListPageResponse,
    OrderResponse,
    OrderTransitionRequest,
)
from app.modules.orders.service import order_service

router = APIRouter(prefix="/orders", tags=["orders"])
admin_router = APIRouter(prefix="/admin/orders", tags=["admin-orders"], dependencies=[Depends(require_role("ADMIN"))])


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


@admin_router.post("/{order_id}/transition", response_model=OrderResponse)
async def admin_transition_order(
    order_id: int,
    payload: OrderTransitionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderResponse:
    return await order_service.transition_order(
        uow,
        order_id=order_id,
        to_code=payload.to_state_code,
        actor_type="admin",
        actor_user_id=current_user.id,
        source="admin_api",
        reason_code=payload.reason_code,
        note=payload.note,
        event_key=f"order:{order_id}:admin:{payload.to_state_code}",
    )
