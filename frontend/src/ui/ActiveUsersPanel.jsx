// frontend/src/ui/ActiveUsersPanel.jsx
import React from "react";

export default function ActiveUsersPanel({ users }) {
  return (
    <div className="active-users-panel w-32 bg-white shadow p-2 text-sm rounded">
      <h3 className="font-semibold mb-2">Users</h3>
      {Object.entries(users).map(([uid, name]) => (
        <div key={uid} className="user-item py-1 px-2 mb-1 rounded">
          {name}
        </div>
      ))}
    </div>
  );
}
