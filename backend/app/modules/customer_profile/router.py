from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.customer_profile.schemas import (
    CustomerChangePasswordRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from app.modules.customer_profile.service import customer_profile_service
from app.modules.identity.model import User

router = APIRouter(prefix="/customer/profile", tags=["customer-profile"])


@router.get("", response_model=CustomerProfileResponse)
async def get_customer_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CustomerProfileResponse:
    return await customer_profile_service.get_profile(uow, current_user)


@router.patch("", response_model=CustomerProfileResponse)
async def update_customer_profile(
    payload: CustomerProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CustomerProfileResponse:
    return await customer_profile_service.update_profile(uow, current_user=current_user, payload=payload)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_customer_password(
    payload: CustomerChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> Response:
    await customer_profile_service.change_password(uow, current_user=current_user, payload=payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
