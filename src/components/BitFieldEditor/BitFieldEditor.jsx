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

  const nextId = useRef(fields.length); // ⬅️ Start after initial fields

  function handleAddField() {
    setFields([...fields, { ...DEFAULT_FIELD, id: String(nextId.current++) }]);
  }

  function handleChange(idx, key, value) {
    setFields((fields) =>
      fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
    );
  }

  function handleRemove(idx) {
    setFields((fields) => fields.filter((_, i) => i !== idx));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  }
  
   console.debug("BitFieldEditor",{fields});
  // Add ids to each field if not present
  const fieldsWithIds = fields.map((field, idx) => ({
    id: field.id ?? idx.toString(),
    ...field,
  }));

  const totalBits = fieldsWithIds.reduce(
    (sum, f) => sum + bitsNeeded(f.max),
    0
  );

  return (
    <div style={{ marginBottom: 32 }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fieldsWithIds.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {fieldsWithIds.map((field, idx) => (
            <SortableField
              key={field.id}
              id={field.id}
              idx={idx}
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

function SortableField({ id, idx, field, onChange, onRemove }) {
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
        onChange={(e) => onChange(idx, "label", e.target.value)}
        style={{ width: 100, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.min}
        onChange={(e) => onChange(idx, "min", Number(e.target.value))}
        style={{ width: 60, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.max}
        onChange={(e) => onChange(idx, "max", Number(e.target.value))}
        style={{ width: 60 }}
      />
      <button
        onClick={() => onRemove(idx)}
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
