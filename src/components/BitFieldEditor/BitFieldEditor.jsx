import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function maxFromBits(bits) {
  return Math.pow(2, bits) - 1;
}

const DEFAULT_FIELD = {
  id: "",
  label: "",
  min: 0,
  max: 255,
  bitWidth: 8,
  mode: "bits", // or "max"
};

export default function BitFieldEditor({ fields, setFields }) {
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAddField() {
    const newField = { ...DEFAULT_FIELD, id: crypto.randomUUID() };
    setFields([...fields, newField]);
  }

  function handleChange(id, key, value) {
    setFields(fields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }

  function handleRemove(id) {
    console.debug("handleRemove", { id });
    setFields(fields.filter((f) => f.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  }

  const totalBits = fields.reduce(
    (sum, f) => sum + (f.mode === "bits" ? f.bitWidth || 0 : bitsNeeded(f.max)),
    0
  );

  return (
    <>
      <h3
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          margin: 0,
        }}
        onClick={toggleExpanded}
      >
        <span style={{ marginRight: 8 }}>{expanded ? "▾" : "▸"}</span>
        Fields
      </h3>
      {expanded && (
        <div style={{ marginBottom: 32 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button onClick={handleAddField} style={{ marginTop: 8 }}>
            + Add Field
          </button>
        </div>
      )}
    </>
  );
}

function SortableField({ field, onChange, onRemove }) {
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
