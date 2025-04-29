import React from "react";

// Color palette (cycle through for each field)
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export default function BitFieldVisualizer({ layout, totalBits }) {
  if (totalBits === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Bit Layout</h3>
      <div
        style={{
          display: "flex",
          height: 30,
          width: "100%",
          maxWidth: 600,
          border: "1px solid #ccc",
          borderRadius: 6,
          overflow: "hidden",
          fontSize: 10,
          lineHeight: "30px",
        }}
      >
        {layout.map((field, idx) => {
          const widthPercent = (field.width / totalBits) * 100;
          const color = COLORS[idx % COLORS.length];

          return (
            <div
              key={field.label}
              title={`${field.label} (${field.width} bits)`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: color,
                color: "white",
                textAlign: "center",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {field.label}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        {totalBits} bits total
      </div>
    </div>
  );
}
