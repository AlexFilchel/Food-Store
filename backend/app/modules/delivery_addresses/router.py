from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.delivery_addresses.schemas import (
    DeliveryAddressCreateRequest,
    DeliveryAddressResponse,
    DeliveryAddressSetDefaultRequest,
    DeliveryAddressUpdateRequest,
)
from app.modules.delivery_addresses.service import delivery_address_service
from app.modules.identity.model import User

router = APIRouter(prefix="/customer/addresses", tags=["customer-addresses"])


@router.get("", response_model=list[DeliveryAddressResponse])
async def list_addresses(
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> list[DeliveryAddressResponse]:
    return await delivery_address_service.list_addresses(uow, user_id=current_user.id)


@router.get("/{address_id}", response_model=DeliveryAddressResponse)
async def get_address(
    address_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> DeliveryAddressResponse:
    return await delivery_address_service.get_address(uow, user_id=current_user.id, address_id=address_id)


@router.post("", response_model=DeliveryAddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: DeliveryAddressCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> DeliveryAddressResponse:
    return await delivery_address_service.create_address(uow, user_id=current_user.id, payload=payload)


@router.patch("/{address_id}", response_model=DeliveryAddressResponse)
async def update_address(
    address_id: int,
    payload: DeliveryAddressUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> DeliveryAddressResponse:
    return await delivery_address_service.update_address(uow, user_id=current_user.id, address_id=address_id, payload=payload)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> Response:
    await delivery_address_service.delete_address(uow, user_id=current_user.id, address_id=address_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{address_id}/default", response_model=DeliveryAddressResponse)
async def set_default_address(
    address_id: int,
    _: DeliveryAddressSetDefaultRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> DeliveryAddressResponse:
    return await delivery_address_service.set_default_address(uow, user_id=current_user.id, address_id=address_id)
