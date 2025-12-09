import json
import asyncio
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("syncanvas.manager")

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.meta: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.rooms.setdefault(room_id, set()).add(websocket)
            # default meta (updated on join event)
            self.meta[websocket] = {"room_id": room_id, "user_id": None, "display_name": None}
        logger.info(f"Socket connected to room {room_id}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            meta = self.meta.pop(websocket, None)
            if meta:
                room_id = meta.get("room_id")
                if room_id and room_id in self.rooms:
                    self.rooms[room_id].discard(websocket)
                    if not self.rooms[room_id]:
                        self.rooms.pop(room_id, None)
                logger.info(f"Disconnected socket from room {room_id}")

    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            logger.exception("Failed sending personal message")
            await self.disconnect(websocket)

    async def broadcast_room(self, room_id: str, message: dict, exclude: Set[WebSocket] = None):
        exclude = exclude or set()
        sockets = list(self.rooms.get(room_id, []))
        for sock in sockets:
            if sock in exclude:
                continue
            try:
                await sock.send_text(json.dumps(message))
            except Exception:
                logger.exception("Error broadcasting to socket; removing")
                await self.disconnect(sock)
