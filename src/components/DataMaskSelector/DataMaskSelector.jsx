import React from "react";

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

export default function DataMaskSelector({ value, onChange }) {
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