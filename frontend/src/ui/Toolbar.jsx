// frontend/src/ui/Toolbar.jsx
import React, { useState } from "react";

const COLORS = [
  "#000000", "#FF0000", "#00AAFF", "#00CC44", "#FFAA00",
  "#AA00FF", "#FF00AA", "#00FFAA", "#888888", "#663300"
];

export default function Toolbar({
  onDownload,
  onClear,
  onDisconnect,
  setTool,
  onToggleDarkMode
}) {

  const [brushSize, setBrushSize] = useState(3);  // NEW

  const handleBrushChange = (value) => {
    setBrushSize(value);
    setTool({
      type: "pen",
      width: Number(value)
    });
  };

  return (
    <div className="toolbar flex gap-3 items-center text-black">

      {/* Dark Mode */}
      <button onClick={onToggleDarkMode} className="px-2 py-1 rounded" title="Toggle dark mode">
        🌙
      </button>

      {/* Undo */}
      <button onClick={() => window.dispatchEvent(new Event("perform_undo"))} className="px-3 py-1 rounded">
        Undo
      </button>

      {/* Redo */}
      <button onClick={() => window.dispatchEvent(new Event("perform_redo"))} className="px-3 py-1 rounded">
        Redo
      </button>

      {/* Color Picker Buttons */}
      <div className="flex gap-1">
        {COLORS.map((col) => (
          <button
            key={col}
            onClick={() =>
              setTool({
                type: "pen",
                color: col,
                width: brushSize   // NEW: keep width same
              })
            }
            className="color-btn w-6 h-6 rounded border"
            style={{ background: col, "--btn-color": col }}
          />
        ))}
      </div>

      {/* Eraser */}
      <button onClick={() => setTool({ type: "eraser", width: 20 })} className="px-3 py-1 rounded">
        Eraser
      </button>

      {/* Brush Size Slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs">Size</span>
        <input
          type="range"
          min="1"
          max="25"
          value={brushSize}
          onChange={(e) => handleBrushChange(e.target.value)}
        />
        <span className="text-xs">{brushSize}</span>
      </div>

      {/* Download */}
      <button onClick={onDownload} className="px-3 py-1 rounded">
        Download
      </button>

      {/* Clear */}
      <button onClick={onClear} className="px-3 py-1 rounded">
        Clear
      </button>

      {/* Leave */}
      <button onClick={onDisconnect} className="px-3 py-1 rounded">
        Leave
      </button>
    </div>
  );
}
