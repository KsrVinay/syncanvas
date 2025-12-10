import { useRef } from "react";

export default function useWebSocket() {
  const wsRef = useRef(null);
  const listenersRef = useRef({});
  const reconnectRef = useRef({ attempts: 0, timeoutId: null });
  const connectionInfoRef = useRef({ roomId: null, userId: null, displayName: null });

  // NEW — queue messages until socket opens
  const sendQueueRef = useRef([]);

  const routeMessage = (data) => {
    try {
      const msg = JSON.parse(data);
      const type = msg.type;
      (listenersRef.current[type] || []).forEach((cb) => cb(msg));
    } catch (e) {
      console.error("Failed to parse WS message:", e);
    }
  };

  // Dynamically pick backend URL
  const getWsUrl = (roomId) => {
    // You must set VITE_BACKEND_URL in Vercel/Render
    // Example: https://syncanvas.onrender.com
    
    const base = import.meta.env.VITE_BACKEND_URL.replace("http", "ws");
    return `${base}/ws/${roomId}`;
  };

  const connect = (roomId, userId, displayName) => {
    const url = getWsUrl(roomId);
    connectionInfoRef.current = { roomId, userId, displayName };

    // If already open → just re-join
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      send(
        JSON.stringify({ type: "join", user_id: userId, display_name: displayName })
      );
      return;
    }

    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      console.log("[ws] connected");
      reconnectRef.current.attempts = 0;

      // Send join
      send(
        JSON.stringify({
          type: "join",
          user_id: userId,
          display_name: displayName,
        })
      );

      // Flush queued messages
      while (sendQueueRef.current.length > 0) {
        const msg = sendQueueRef.current.shift();
        wsRef.current.send(msg);
      }
    };

    wsRef.current.onmessage = (ev) => routeMessage(ev.data);

    wsRef.current.onclose = (ev) => {
      console.warn("[ws] closed", ev.code);
      attemptReconnect();
    };

    wsRef.current.onerror = (err) => {
      console.error("[ws] error", err);
    };
  };

  const attemptReconnect = () => {
    const info = connectionInfoRef.current;
    if (!info.roomId) return;

    const attempts = (reconnectRef.current.attempts += 1);
    const delay = Math.min(30000, attempts * 1500);

    console.log(`[ws] reconnecting in ${delay}ms`);

    reconnectRef.current.timeoutId = setTimeout(() => {
      connect(info.roomId, info.userId, info.displayName);
    }, delay);
  };

  const send = (payload) => {
    try {
      const ws = wsRef.current;

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        console.warn("[ws] socket not open → queued");
        sendQueueRef.current.push(payload);
      }
    } catch (e) {
      console.error("[ws] send error", e);
    }
  };

  const disconnect = () => {
    if (reconnectRef.current.timeoutId)
      clearTimeout(reconnectRef.current.timeoutId);

    try {
      wsRef.current?.close();
    } catch (e) {}

    wsRef.current = null;
    connectionInfoRef.current = { roomId: null, userId: null, displayName: null };
  };

  const subscribe = (type, cb) => {
    if (!listenersRef.current[type]) listenersRef.current[type] = [];
    listenersRef.current[type].push(cb);

    return () => {
      listenersRef.current[type] = listenersRef.current[type].filter((x) => x !== cb);
    };
  };

  return {
    connect,
    send,
    subscribe,
    disconnect,
  };
}
