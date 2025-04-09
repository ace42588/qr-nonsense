import React from "react";

const levels = [
  { label: "Low (L) – 7% redundancy", value: "L" },
  { label: "Medium (M) – 15% redundancy", value: "M" },
  { label: "Quartile (Q) – 25% redundancy", value: "Q" },
  { label: "High (H) – 30% redundancy", value: "H" },
];

export default function ErrorCorrectionSelector({ value, onChange }) {
  return (
    <div className="error-correction-selector">
      <label htmlFor="ec-level">Error Correction Level:</label>
      <select
        id="ec-level"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {levels.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    </div>
  );
}
