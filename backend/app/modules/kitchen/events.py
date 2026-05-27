from __future__ import annotations

import asyncio

import structlog
from fastapi import WebSocket

from app.modules.kitchen.schemas import KitchenEventResponse

logger = structlog.get_logger("kitchen.events")


class KitchenConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, event: KitchenEventResponse) -> None:
        async with self._lock:
            recipients = tuple(self._connections)

        if not recipients:
            return

        stale_connections: list[WebSocket] = []
        for websocket in recipients:
            try:
                await websocket.send_json(event.model_dump(mode="json"))
            except Exception as exc:  # pragma: no cover - defensive boundary around socket transport
                logger.warning("kitchen.websocket_send_failed", error=str(exc))
                stale_connections.append(websocket)

        for websocket in stale_connections:
            await self.disconnect(websocket)


kitchen_connection_manager = KitchenConnectionManager()


async def publish_kitchen_event(event: KitchenEventResponse) -> None:
    try:
        await kitchen_connection_manager.broadcast(event)
    except Exception as exc:  # pragma: no cover - best effort delivery must never break requests
        logger.warning("kitchen.publish_failed", error=str(exc), event_type=event.type, order_id=event.order_id)
