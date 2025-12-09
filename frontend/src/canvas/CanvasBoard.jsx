// frontend/src/canvas/CanvasBoard.jsx

import React, { useRef, useEffect, useState, forwardRef } from "react";
import { drawStroke } from "./strokeUtils";
import { assignColorForUser } from "./cursorUtils";
import ActiveUsersPanel from "../ui/ActiveUsersPanel";
import DrawingIndicator from "../ui/DrawingIndicator";

const CanvasBoard = forwardRef(function CanvasBoard({ roomId, userId, displayName, ws, tool }, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const drawing = useRef(false);
  const pointsRef = useRef([]);
  const localStrokesBuffer = useRef([]);

  const [remoteStrokes, setRemoteStrokes] = useState([]);
  const [cursors, setCursors] = useState({});
  const colorMapRef = useRef({});

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  const [activeUsers, setActiveUsers] = useState({});
  const [drawingUsers, setDrawingUsers] = useState({});
  const drawingTimersRef = useRef({});

  const cursorTimersRef = useRef({});

  const [currentTool, setCurrentTool] = useState({
    type: "pen",
    color: "#000000",
    width: 2
  });

  const resolveUserName = (uid) => activeUsers[uid] || uid;

  // --------------------------------------------------
  // NEW: FIX USER NOT REMOVED FROM LIST
  // --------------------------------------------------
  useEffect(() => {
    const handleClose = () => {
      try {
        ws?.send(JSON.stringify({ type: "leave", user_id: userId }));
      } catch {}
    };

    window.addEventListener("beforeunload", handleClose);
    return () => window.removeEventListener("beforeunload", handleClose);
  }, [ws, userId]);
  // --------------------------------------------------

  // Sync tool update
  useEffect(() => {
    if (tool) {
      setCurrentTool({
        type: tool.type || "pen",
        color: tool.color || currentTool.color,
        width: typeof tool.width === "number" ? tool.width : currentTool.width
      });
    }
  }, [tool]);

  const prepareCanvas = (canvas) => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  };

  const redrawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = prepareCanvas(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    remoteStrokes.forEach((s) =>
      drawStroke(ctx, s.points, s.color || "#000", s.width || 2)
    );
  };

  useEffect(() => redrawAll(), [remoteStrokes]);

  const performUndo = () => {
    const idx = remoteStrokes.slice().reverse().findIndex((s) => s.user_id === userId);
    if (idx === -1) return;
    const realIdx = remoteStrokes.length - 1 - idx;
    const stroke = remoteStrokes[realIdx];
    setRemoteStrokes((prev) => {
      const copy = [...prev];
      copy.splice(realIdx, 1);
      return copy;
    });
    redoStackRef.current.push(stroke);
    ws?.send(JSON.stringify({ type: "undo", stroke_id: stroke.id, user_id: userId }));
  };

  const performRedo = () => {
    const stroke = redoStackRef.current.pop();
    if (!stroke) return;
    setRemoteStrokes((prev) => [...prev, stroke]);
    ws?.send(JSON.stringify({ type: "redo", stroke, user_id: userId }));
  };

  useEffect(() => {
    const undoHandler = () => performUndo();
    const redoHandler = () => performRedo();
    window.addEventListener("perform_undo", undoHandler);
    window.addEventListener("perform_redo", redoHandler);
    return () => {
      window.removeEventListener("perform_undo", undoHandler);
      window.removeEventListener("perform_redo", redoHandler);
    };
  }, [ws, userId, remoteStrokes]);

  const markUserDrawing = (uid, name) => {
    setDrawingUsers((prev) => ({ ...prev, [uid]: name }));
    if (drawingTimersRef.current[uid])
      clearTimeout(drawingTimersRef.current[uid]);

    drawingTimersRef.current[uid] = setTimeout(() => {
      setDrawingUsers((prev) => {
        const c = { ...prev };
        delete c[uid];
        return c;
      });
      delete drawingTimersRef.current[uid];
    }, 1200);
  };

  const markCursor = (uid, cursorData) => {
    setCursors((prev) => ({ ...prev, [uid]: cursorData }));
    if (cursorTimersRef.current[uid]) clearTimeout(cursorTimersRef.current[uid]);
    cursorTimersRef.current[uid] = setTimeout(() => {
      setCursors((prev) => {
        const c = { ...prev };
        delete c[uid];
        return c;
      });
      delete cursorTimersRef.current[uid];
    }, 600);
  };

  useEffect(() => {
    if (!ws) return;

    const unsubStroke = ws.subscribe("stroke_batch", (msg) => {
      const from = msg.user_id || "unknown";
      if (!colorMapRef.current[from])
        colorMapRef.current[from] = assignColorForUser(from);
      const enriched = (msg.strokes || []).map((s) => ({
        ...s,
        color: s.color || colorMapRef.current[from]
      }));
      setRemoteStrokes((prev) => [...prev, ...enriched]);
      enriched.forEach((s) => {
        if (s.user_id === userId) undoStackRef.current.push(s);
      });
      markUserDrawing(from, resolveUserName(from));
    });

    const unsubCursor = ws.subscribe("cursor_move", (msg) => {
      if (msg.user_id === userId) return;
      if (!colorMapRef.current[msg.user_id])
        colorMapRef.current[msg.user_id] = assignColorForUser(msg.user_id);
      markCursor(msg.user_id, {
        x: msg.x,
        y: msg.y,
        tool: msg.tool,
        color: colorMapRef.current[msg.user_id],
        name: resolveUserName(msg.user_id)
      });
    });

    const unsubUndo = ws.subscribe("undo", (msg) => {
      setRemoteStrokes((prev) => prev.filter((s) => s.id !== msg.stroke_id));
    });

    const unsubRedo = ws.subscribe("redo", (msg) => {
      if (msg.stroke) setRemoteStrokes((prev) => [...prev, msg.stroke]);
    });

    const unsubClear = ws.subscribe("clear_canvas", () => {
      setRemoteStrokes([]);
      setCursors({});
      undoStackRef.current = [];
      redoStackRef.current = [];
    });

    const unsubJoin = ws.subscribe("join", (msg) => {
      setActiveUsers((prev) => ({
        ...prev,
        [msg.user_id]: msg.display_name
      }));
    });

    const unsubLeave = ws.subscribe("leave", (msg) => {
      setActiveUsers((prev) => {
        const c = { ...prev };
        delete c[msg.user_id];
        return c;
      });
      setDrawingUsers((prev) => {
        const c = { ...prev };
        delete c[msg.user_id];
        return c;
      });
      setCursors((prev) => {
        const c = { ...prev };
        delete c[msg.user_id];
        return c;
      });
    });

    const unsubPresence = ws.subscribe("presence_snapshot", (msg) => {
      const p = msg.presence || {};
      setActiveUsers(p);

      setDrawingUsers((prev) => {
        const c = { ...prev };
        Object.keys(c).forEach((uid) => {
          if (!p[uid]) delete c[uid];
        });
        return c;
      });

      setCursors((prev) => {
        const c = { ...prev };
        Object.keys(c).forEach((uid) => {
          if (!p[uid]) delete c[uid];
        });
        return c;
      });
    });

    return () => {
      unsubStroke();
      unsubCursor();
      unsubUndo();
      unsubRedo();
      unsubClear();
      unsubJoin();
      unsubLeave();
      unsubPresence();
    };
  }, [ws, userId, activeUsers]);

  // DRAWING logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (ev) => {
      const r = canvas.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };

    const onDown = (ev) => {
      drawing.current = true;
      pointsRef.current = [getPos(ev)];
      setDrawingUsers((prev) => ({ ...prev, [userId]: displayName }));
      if (drawingTimersRef.current[userId]) {
        clearTimeout(drawingTimersRef.current[userId]);
        delete drawingTimersRef.current[userId];
      }
    };

    const onMove = (ev) => {
      const p = getPos(ev);
      ws?.send(JSON.stringify({
        type: "cursor_move",
        user_id: userId,
        x: p[0],
        y: p[1],
        tool: currentTool.type,
        display_name: displayName
      }));

      if (!drawing.current) return;

      pointsRef.current.push(p);

      const ctx = canvas.getContext("2d");
      const lastTwo = pointsRef.current.slice(-2);

      const isEraser = currentTool.type === "eraser";
      const width = currentTool.width || 2;

      if (lastTwo.length === 2) {
        ctx.beginPath();
        ctx.moveTo(lastTwo[0][0], lastTwo[0][1]);
        ctx.lineTo(lastTwo[1][0], lastTwo[1][1]);
        ctx.strokeStyle = isEraser ? "#FFFFFF" : currentTool.color;
        ctx.lineWidth = isEraser ? 20 : width;
        ctx.stroke();
      }
    };

    const onUp = () => {
      if (!drawing.current) return;
      drawing.current = false;

      const isEraser = currentTool.type === "eraser";
      const width = currentTool.width || 2;

      const stroke = {
        id: `${userId}_${Date.now()}`,
        points: pointsRef.current,
        color: isEraser ? "#FFFFFF" : currentTool.color,
        width: isEraser ? 20 : width,
        user_id: userId
      };

      setRemoteStrokes((prev) => [...prev, stroke]);
      undoStackRef.current.push(stroke);
      redoStackRef.current = [];
      localStrokesBuffer.current.push(stroke);
      markUserDrawing(userId, displayName);
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [ws, userId, currentTool, displayName]);

  // Stroke batching
  useEffect(() => {
    const i = setInterval(() => {
      const buf = localStrokesBuffer.current.splice(0);
      if (buf.length && ws) {
        ws.send(JSON.stringify({
          type: "stroke_batch",
          strokes: buf,
          timestamp: Date.now(),
          user_id: userId
        }));
      }
    }, 150);
    return () => clearInterval(i);
  }, [ws, userId]);

  // Render cursor layer
  useEffect(() => {
    const layer = containerRef.current?.querySelector(".cursor-overlay");
    if (!layer) return;

    layer.innerHTML = "";

    Object.values(cursors).forEach((c) => {
      const node = document.createElement("div");
      node.style.position = "absolute";
      node.style.left = `${c.x}px`;
      node.style.top = `${c.y}px`;
      node.style.transform = "translate(-50%, -50%)";
      node.style.pointerEvents = "none";

      const icon =
        c.tool === "eraser"
          ? `<div style="width:18px;height:12px;background:white;border:2px solid #333;border-radius:3px"></div>`
          : `<div style="width:12px;height:12px;background:${c.color};border-radius:3px"></div>`;

      node.innerHTML = `${icon}<div style="font-size:11px">${c.name}</div>`;
      layer.appendChild(node);
    });
  }, [cursors]);

  // Download canvas
  useEffect(() => {
    const handler = () => {
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `syncanvas_${roomId}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    window.addEventListener("download_canvas", handler);
    return () => window.removeEventListener("download_canvas", handler);
  }, [roomId]);

  return (
    <div ref={containerRef} className="flex-1 relative canvas-container">

      {/* Active Users */}
      <div style={{ position: "absolute", left: 8, top: 8, zIndex: 60 }}>
        <ActiveUsersPanel users={activeUsers} />
      </div>

      {/* Drawing indicator */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 60
        }}
      >
        <DrawingIndicator drawingUsers={drawingUsers} />
      </div>

      {/* Cursor overlay */}
      <div className="cursor-overlay absolute inset-0 pointer-events-none"></div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full bg-white" />
    </div>
  );
});

export default CanvasBoard;
