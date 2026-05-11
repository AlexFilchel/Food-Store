from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.checkout.schemas import CheckoutPreflightRequest, CheckoutPreflightResponse
from app.modules.checkout.service import checkout_service
from app.modules.identity.model import User

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/preflight", response_model=CheckoutPreflightResponse)
async def checkout_preflight(
    payload: CheckoutPreflightRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> CheckoutPreflightResponse:
    return await checkout_service.preflight(uow, user_id=current_user.id, payload=payload)
