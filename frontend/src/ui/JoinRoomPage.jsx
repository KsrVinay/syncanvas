// frontend/src/ui/JoinRoomPage.jsx
import React, { useState } from "react";
import "../styles/join.css";

export default function JoinRoomPage({ onJoin }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  return (
    <div className="join-container">

      {/* Glass box */}
      <div className="glass-box">

        <h1 className="title">Syncanvas</h1>
        <p className="subtitle">Collaborative Whiteboard</p>

        <input
          className="input-field"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="input-field"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button
          className="join-btn"
          onClick={() => {
            if (username.trim() && roomId.trim()) {
              onJoin({
                displayName: username,
                roomId: roomId,
                userId: username
              });
            }
          }}
        >
          Join Room
        </button>
      </div>

      {/* Footer bar */}
      <div className="footer-bar">
        Developed by <strong>Sri Ram Vinay</strong> • Powered by React + FastAPI + WebSockets
      </div>

    </div>
  );
}
