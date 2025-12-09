from typing import Dict, List, Any
import threading

class RoomStateBuffer:
    def __init__(self, max_strokes_per_room: int = 10000):
        self._lock = threading.Lock()
        self._rooms: Dict[str, Dict[str, Any]] = {}
        self.max_strokes_per_room = max_strokes_per_room

    def _ensure(self, room_id: str):
        if room_id not in self._rooms:
            self._rooms[room_id] = {"strokes": [], "cursors": {}, "presence": {}}

    def add_strokes(self, room_id: str, strokes: List[dict]):
        with self._lock:
            self._ensure(room_id)
            self._rooms[room_id]['strokes'].extend(strokes)
            # trim
            if len(self._rooms[room_id]['strokes']) > self.max_strokes_per_room:
                self._rooms[room_id]['strokes'] = self._rooms[room_id]['strokes'][-self.max_strokes_per_room:]

    def add_stroke(self, room_id: str, stroke: dict):
        self.add_strokes(room_id, [stroke])

    def remove_stroke_by_id(self, room_id: str, stroke_id: str) -> bool:
        with self._lock:
            self._ensure(room_id)
            strokes = self._rooms[room_id]['strokes']
            new = [s for s in strokes if s.get('id') != stroke_id]
            removed = len(new) != len(strokes)
            if removed:
                self._rooms[room_id]['strokes'] = new
            return removed

    def get_recent_strokes(self, room_id: str) -> List[dict]:
        with self._lock:
            self._ensure(room_id)
            return list(self._rooms[room_id]['strokes'])

    def set_cursor(self, room_id: str, user_id: str, cursor: dict):
        with self._lock:
            self._ensure(room_id)
            self._rooms[room_id]['cursors'][user_id] = cursor

    def get_cursors(self, room_id: str):
        with self._lock:
            self._ensure(room_id)
            return dict(self._rooms[room_id]['cursors'])

    def add_presence(self, room_id: str, user_id: str, display_name: str):
        with self._lock:
            self._ensure(room_id)
            self._rooms[room_id]['presence'][user_id] = display_name

    def remove_presence(self, room_id: str, user_id: str):
        with self._lock:
            self._ensure(room_id)
            self._rooms[room_id]['presence'].pop(user_id, None)

    def get_presence(self, room_id: str):
        with self._lock:
            self._ensure(room_id)
            return dict(self._rooms[room_id]['presence'])

    def clear_room(self, room_id: str):
        with self._lock:
            self._rooms[room_id] = {"strokes": [], "cursors": {}, "presence": {}}
