from typing import Annotated

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status

from app.core.errors import AppError
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import require_role
from app.modules.auth.service import auth_service
from app.modules.kitchen.events import kitchen_connection_manager
from app.modules.kitchen.schemas import KitchenQueueResponse
from app.modules.kitchen.service import kitchen_service

router = APIRouter(prefix="/cocina", tags=["kitchen"])


@router.get("/pedidos", response_model=KitchenQueueResponse, dependencies=[Depends(require_role("COCINA", "PEDIDOS", "ADMIN"))])
async def list_kitchen_orders(
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> KitchenQueueResponse:
    return await kitchen_service.list_queue(uow)


@router.websocket("/ws")
async def kitchen_websocket(
    websocket: WebSocket,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user = await auth_service.get_current_user(uow, token)
        await auth_service.require_roles(uow, user, {"COCINA", "PEDIDOS", "ADMIN"})
    except AppError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await kitchen_connection_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await kitchen_connection_manager.disconnect(websocket)
