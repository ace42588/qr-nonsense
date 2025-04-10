import React from "react";

const ErrorCorrectionLevel = ["M", "L", "H", "Q"];

const levels = [
  { label: "Low (L) – 7% redundancy", value: "1" },
  { label: "Medium (M) – 15% redundancy", value: "0" },
  { label: "Quartile (Q) – 25% redundancy", value: "3" },
  { label: "High (H) – 30% redundancy", value: "2" },
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
