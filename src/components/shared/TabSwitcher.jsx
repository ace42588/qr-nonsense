// TabSwitcher.jsx
import React from "react";
import "./TabSwitcher.css";

export function TabSwitcher({ options, active, onChange }) {
  return (
    <div className="tab-switcher">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`tab-button ${opt.value === active ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
