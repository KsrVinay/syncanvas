// frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import JoinRoomPage from "./ui/JoinRoomPage";
import CanvasBoard from "./canvas/CanvasBoard";
import Toolbar from "./ui/Toolbar";
import useWebSocket from "./ws/useWebSocket";
import "./darkmode.css"; // <-- new import

export default function App() {
  const [joinedData, setJoinedData] = useState(null);
  const [tool, setTool] = useState({ type: "pen", color: "#000000" });
  const [darkMode, setDarkMode] = useState(false);   // NEW
  const ws = useWebSocket();

  const toggleDarkMode = () => setDarkMode(m => !m);

  useEffect(() => {
    const handler = () => {
      if (!ws || !joinedData) return;
      ws.send(JSON.stringify({ type: "clear_canvas", user_id: joinedData.userId }));
    };
    window.addEventListener("clear_request", handler);
    return () => window.removeEventListener("clear_request", handler);
  }, [ws, joinedData]);

  return (
    <div id="app-root" className={darkMode ? "dark-mode h-screen flex flex-col" : "h-screen flex flex-col"}>

      {!joinedData ? (
        <div className="m-auto w-full max-w-md">
          <JoinRoomPage
            onJoin={(data) => {
              setJoinedData(data);
              ws.connect(data.roomId, data.userId, data.displayName);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">

          {/* Top Bar */}
          <div className="topbar flex items-center justify-between p-2 bg-white shadow">
            <div className="text-sm">Room: <span className="font-semibold">{joinedData.roomId}</span></div>
            <div className="text-sm">User: <span className="font-semibold">{joinedData.displayName}</span></div>

            <Toolbar
              setTool={setTool}
              onToggleDarkMode={toggleDarkMode}
              onDownload={() => window.dispatchEvent(new Event("download_canvas"))}
              onClear={() => window.dispatchEvent(new Event("clear_request"))}
              onDisconnect={() => {
                ws.disconnect();
                setJoinedData(null);
              }}
            />
          </div>

          {/* Canvas */}
          <CanvasBoard
            roomId={joinedData.roomId}
            userId={joinedData.userId}
            displayName={joinedData.displayName}
            ws={ws}
            tool={tool}
            darkMode={darkMode}
          />
        </div>
      )}

    </div>
  );
}
