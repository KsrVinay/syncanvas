// frontend/src/ui/SnapshotPanel.jsx
import React, { useEffect, useState } from "react";

/*
  RESTORED ORIGINAL SNAPSHOT PANEL (read-only)
  - Calls backend snapshots API at /api/snapshots/<roomId>
  - Shows list of saved snapshots only (no click/load behavior)
  - Will NOT send any websocket messages when clicked
  - This matches the earlier "perfect" state
*/

export default function SnapshotPanel({ roomId }) {
  const [snapshots, setSnapshots] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;

    // NOTE: backend exposes snapshots under /api/snapshots/<room_id>
    fetch(`http://localhost:8000/snapshots/${roomId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          // defensive: if backend returns object, set empty array
          console.warn("Snapshots API returned non-array:", data);
          setSnapshots([]);
          return;
        }
        setSnapshots(data);
      })
      .catch((e) => {
        console.error("Failed to load snapshots:", e);
        setError("Unable to load snapshots");
        setSnapshots([]);
      });
  }, [roomId]);

  return (
    <div className="w-64 p-3 bg-gray-100 border-l overflow-y-auto">
      <h2 className="font-semibold text-lg mb-3">Saved Snapshots</h2>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      {snapshots.length === 0 && (
        <div className="text-sm text-gray-600">No snapshots yet.</div>
      )}

      {snapshots.map((s) => (
        <div
          key={s.snapshot_id ?? s.snapshotId ?? s.id}
          className="p-2 mb-2 rounded bg-white shadow text-sm"
        >
          <div className="font-medium">Snapshot #{s.snapshot_id ?? s.id}</div>
          <div className="text-xs text-gray-600">
            {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
