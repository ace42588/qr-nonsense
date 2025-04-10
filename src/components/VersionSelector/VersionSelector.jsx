import React from "react";

const versions = [{ label: "Auto", value: "auto" }].concat(
  Array.from({ length: 40 }, (_, i) => ({
    label: `Version ${i + 1}`,
    value: i + 1,
  }))
);


export default function VersionSelector({ value, onChange }) {
  return (
    <div className="version-selector">
      <label htmlFor="qr-version">QR Code Version:</label>
      <select
        id="qr-version"
        value={value}
        onChange={(e) => onChange(e.target.value === "auto" ? "auto" : parseInt(e.target.value))}
      >
        {versions.map((ver) => (
          <option key={ver.value} value={ver.value}>
            {ver.label}
          </option>
        ))}
      </select>
    </div>
  );
}