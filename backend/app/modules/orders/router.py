from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.identity.model import User
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderListResponse,
    OrderResponse,
)
from app.modules.orders.service import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderResponse:
    return await order_service.create_order(uow, user_id=current_user.id, payload=payload)


@router.get("", response_model=list[OrderListResponse])
async def list_orders(
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> list[OrderListResponse]:
    return await order_service.list_orders(uow, user_id=current_user.id)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> OrderResponse:
    return await order_service.get_order(uow, user_id=current_user.id, order_id=order_id)
