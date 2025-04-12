import React from "react";

const levels = [
  { label: "Low (L) – 7% redundancy", value: 0 },
  { label: "Medium (M) – 15% redundancy", value: 1 },
  { label: "Quartile (Q) – 25% redundancy", value: 2 },
  { label: "High (H) – 30% redundancy", value: 3 },
];

export function ErrorCorrectionSelector({ value, onChange }) {
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


const masks = [
  { label: "Auto", value: "auto" },
  { label: "Mask 0", value: 0 },
  { label: "Mask 1", value: 1 },
  { label: "Mask 2", value: 2 },
  { label: "Mask 3", value: 3 },
  { label: "Mask 4", value: 4 },
  { label: "Mask 5", value: 5 },
  { label: "Mask 6", value: 6 },
  { label: "Mask 7", value: 7 },
];

export function DataMaskSelector({ value, onChange }) {
  return (
    <div className="data-mask-selector">
      <label htmlFor="data-mask">Data Mask:</label>
      <select
        id="data-mask"
        value={value}
        onChange={(e) => onChange(e.target.value === "auto" ? "auto" : parseInt(e.target.value))}
      >
        {masks.map((mask) => (
          <option key={mask.value} value={mask.value}>
            {mask.label}
          </option>
        ))}
      </select>
    </div>
  );
}