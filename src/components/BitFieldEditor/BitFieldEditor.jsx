import React, { useRef } from "react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { bitsNeeded } from "./utils";

const DEFAULT_FIELD = { label: "", min: 0, max: 255 };

export default function BitFieldEditor({ fields, setFields }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const nextId = useRef(fields.length);

  function handleAddField() {
    setFields((prev) => [...prev, { ...DEFAULT_FIELD, id: nextId.current++ }]);
  }

  function handleChange(id, key, value) {
    setFields((fields) =>
      fields.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  }

  function handleRemove(id) {
    setFields((fields) => fields.filter((f) => f.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  }

  const totalBits = fields.reduce((sum, f) => sum + bitsNeeded(f.max), 0);

  return (
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
              id={field.id}
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
      <div style={{ marginTop: 8, color: "#888" }}>
        Total bits: <b>{totalBits}</b>
      </div>
    </div>
  );
}

function SortableField({ id, field, onChange, onRemove }) {
  console.debug("SortableField", { onRemove });
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
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

  const bitCount = bitsNeeded(field.max);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span style={{ cursor: "grab", marginRight: 8 }}>☰</span>
      <input
        type="text"
        placeholder="Label"
        value={field.label}
        onChange={(e) => onChange(id, "label", e.target.value)}
        style={{ width: 100, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.min}
        onChange={(e) => onChange(id, "min", Number(e.target.value))}
        style={{ width: 60, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.max}
        onChange={(e) => onChange(id, "max", Number(e.target.value))}
        style={{ width: 60 }}
      />
      <button
        onClick={() => onRemove(id)}
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
