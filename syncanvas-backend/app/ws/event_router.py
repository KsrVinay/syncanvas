import logging
from typing import Any
from .events import mk_server_event, parse_client_event

logger = logging.getLogger("syncanvas.router")

class EventRouter:
    def __init__(self, manager, buffer):
        self.manager = manager
        self.buffer = buffer

    async def route(self, room_id: str, websocket, raw_text: str):
        try:
            event = parse_client_event(raw_text)
        except Exception as e:
            err = {'type': 'error', 'message': f'invalid_event: {str(e)}'}
            await self.manager.send_personal(websocket, mk_server_event(err, 'server'))
            logger.warning('Invalid event: %s', e)
            return

        ev_type = event.get('type')
        user_id = event.get('user_id') or (self.manager.meta.get(websocket) or {}).get('user_id') or 'unknown'
        display_name = event.get('display_name') or (self.manager.meta.get(websocket) or {}).get('display_name') or 'unknown'

        # JOIN
        if ev_type == 'join':
            # update meta and presence
            try:
                self.manager.meta[websocket] = {'user_id': user_id, 'display_name': display_name, 'room_id': room_id}
            except Exception:
                logger.exception('Error setting meta on join')
            self.buffer.add_presence(room_id, user_id, display_name)

            # --- NEW: send stroke history (so the joining client immediately sees the current board) ---
            try:
                history = self.buffer.get_recent_strokes(room_id)
                history_payload = {'type': 'stroke_batch', 'strokes': history}
                await self.manager.send_personal(websocket, mk_server_event(history_payload, 'server'))
            except Exception:
                logger.exception("Failed sending history to joining client")

            # --- NEW: send presence snapshot to the joining client (so they see all current users) ---
            try:
                presence = self.buffer.get_presence(room_id)
                presence_payload = {'type': 'presence_snapshot', 'presence': presence}
                await self.manager.send_personal(websocket, mk_server_event(presence_payload, 'server'))
            except Exception:
                logger.exception("Failed sending presence snapshot to joining client")

            # Broadcast join to everyone ELSE in the room (exclude joiner so they don't get duplicate)
            payload = {'type': 'join', 'user_id': user_id, 'display_name': display_name}
            msg = mk_server_event(payload, user_id)
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        # STROKE BATCH
        elif ev_type == 'stroke_batch':
            strokes = event.get('strokes', [])
            if strokes:
                self.buffer.add_strokes(room_id, strokes)
            payload = {'type': 'stroke_batch', 'strokes': strokes, 'timestamp': event.get('timestamp'), "display_name": display_name, "user_id": user_id}
            msg = mk_server_event(payload, user_id)
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        # CURSOR MOVE
        elif ev_type == 'cursor_move':
            cursor = {'type': 'cursor_move', 'user_id': user_id, 'x': event.get('x'), 'y': event.get('y'), 'display_name': display_name, 'tool': event.get('tool')}
            self.buffer.set_cursor(room_id, user_id, cursor)
            msg = mk_server_event(cursor, user_id)
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        # CLEAR CANVAS
        elif ev_type == 'clear_canvas':
            logger.info(f'Canvas clear requested in room {room_id} by {user_id}')
            self.buffer.clear_room(room_id)
            payload = {'type': 'clear_canvas'}
            msg = mk_server_event(payload, 'server')
            await self.manager.broadcast_room(room_id, msg)

        # UNDO
        elif ev_type == 'undo':
            stroke_id = event.get('stroke_id')
            removed = False
            if stroke_id:
                removed = self.buffer.remove_stroke_by_id(room_id, stroke_id)
            payload = {'type': 'undo', 'stroke_id': stroke_id, 'removed': removed, 'user_id': user_id}
            msg = mk_server_event(payload, 'server')
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        # REDO
        elif ev_type == 'redo':
            stroke = event.get('stroke')
            if stroke:
                self.buffer.add_stroke(room_id, stroke)
            payload = {'type': 'redo', 'stroke': stroke, 'user_id': user_id}
            msg = mk_server_event(payload, 'server')
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        # LEAVE
        elif ev_type == 'leave':
            self.buffer.remove_presence(room_id, user_id)
            try:
                if websocket in self.manager.meta:
                    self.manager.meta.pop(websocket, None)
            except Exception:
                logger.exception('Error removing meta on leave')
            payload = {'type': 'leave', 'user_id': user_id}
            msg = mk_server_event(payload, user_id)
            await self.manager.broadcast_room(room_id, msg, exclude={websocket})

        else:
            err = {'type': 'error', 'message': f'unknown_event_type: {ev_type}'}
            await self.manager.send_personal(websocket, mk_server_event(err, 'server'))
            logger.warning('Unknown event type: %s', ev_type)
