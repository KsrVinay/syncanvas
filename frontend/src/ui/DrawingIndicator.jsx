// frontend/src/ui/DrawingIndicator.jsx
import React from "react";

export default function DrawingIndicator({ drawingUsers }) {
  const list = Object.values(drawingUsers);
  if (list.length === 0)
    return (
      <div className="drawing-indicator text-sm italic text-gray-500">
        No one is drawing
      </div>
    );

  return (
    <div className="drawing-indicator text-sm font-medium text-blue-600">
      {list.join(", ")} {list.length > 1 ? "are" : "is"} drawing...
    </div>
  );
}
