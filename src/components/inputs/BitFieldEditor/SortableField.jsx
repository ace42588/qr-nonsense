import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { bitsNeeded } from "./utils";

function maxFromBits(bits) {
  return Math.pow(2, bits) - 1;
}

export function SortableField({ field, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    marginBottom: 8,
    background: "#f5f5fa",
    borderRadius: 6,
    padding: "8px",
  };

  const bitCount =
    field.mode === "max" ? bitsNeeded(field.max) : field.bitWidth || 1;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
        ☰
      </span>
      <input
        type="text"
        placeholder="Label"
        value={field.label}
        onChange={(e) => onChange(field.id, "label", e.target.value)}
        style={{ width: 100, marginRight: 8 }}
      />

      <select
        value={field.mode}
        onChange={(e) => onChange(field.id, "mode", e.target.value)}
        style={{ marginRight: 8 }}
      >
        <option value="max">Max Value</option>
        <option value="bits">Bit Width</option>
      </select>
      {field.mode === "max" ? (
        <input
          type="number"
          value={field.max}
          onChange={(e) => onChange(field.id, "max", Number(e.target.value))}
          style={{ width: 80 }}
        />
      ) : (
        <input
          type="number"
          value={field.bitWidth}
          onChange={(e) => {
            const bw = Number(e.target.value);
            onChange(field.id, "bitWidth", bw);
            onChange(field.id, "max", maxFromBits(bw));
          }}
          style={{ width: 80 }}
        />
      )}
      {field.mode === "max" && (
        <div style={{ marginLeft: 8, fontSize: 12, color: "#666" }}>
          ({bitCount} bits)
        </div>
      )}
      <button
        onClick={() => onRemove(field.id)}
        style={{
          marginLeft: 8,
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}
