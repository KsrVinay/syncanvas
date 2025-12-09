# app/main.py
import logging
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.ws.manager import ConnectionManager
from app.ws.state_buffer import RoomStateBuffer
from app.ws.event_router import EventRouter
from app.ws.events import mk_server_event

logger = logging.getLogger("syncanvas.main")
logging.basicConfig(level=logging.INFO)

app = FastAPI()

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()
buffer = RoomStateBuffer()
router = EventRouter(manager, buffer)


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):

    # Accept + register connection
    await manager.connect(room_id, websocket)

    # ------------------------------------------------------------------
    # ⭐ NEW: Immediately send history + presence snapshot to NEW client
    # ------------------------------------------------------------------
    try:
        # Send stroke history
        try:
            history = buffer.get_recent_strokes(room_id)
            history_payload = {"type": "stroke_batch", "strokes": history}
            await manager.send_personal(
                websocket,
                mk_server_event(history_payload, "server")
            )
        except Exception:
            logger.exception("Failed to send stroke history on connect")

        # Send presence snapshot
        try:
            presence = buffer.get_presence(room_id)
            presence_payload = {"type": "presence_snapshot", "presence": presence}
            await manager.send_personal(
                websocket,
                mk_server_event(presence_payload, "server")
            )
        except Exception:
            logger.exception("Failed to send presence snapshot on connect")

    except Exception:
        logger.exception("Error while sending initial room state")

    # ------------------------------------------------------------------
    # Normal message loop
    # ------------------------------------------------------------------
    try:
        while True:
            data = await websocket.receive_text()
            await router.route(room_id, websocket, data)

    except WebSocketDisconnect:
        await manager.disconnect(websocket)

    except Exception as e:
        logger.exception("WebSocket error: %s", e)
        try:
            await manager.disconnect(websocket)
        except:
            pass
