import React, { useRef } from "react";
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

const DEFAULT_FIELD = { label: "", min: 0, max: 255 };

export default function BitFieldEditor({ fields, setFields }) {
  const nextId = useRef(
    Math.max(0, ...fields.map((f) => parseInt(f.id ?? "-1"))) + 1
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAddField() {
    const newField = { ...DEFAULT_FIELD, id: String(nextId.current++) };
    setFields((prevFields) => [...prevFields, newField]);
  }

  function handleChange(id, key, value) {
    setFields((prevFields) =>
      prevFields.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  }

  function handleRemove(id) {
    setFields((prevFields) => prevFields.filter((f) => f.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setFields((prevFields) => {
        const oldIndex = prevFields.findIndex((f) => f.id === active.id);
        const newIndex = prevFields.findIndex((f) => f.id === over.id);
        return arrayMove(prevFields, oldIndex, newIndex);
      });
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

  const bitCount = bitsNeeded(field.max);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span style={{ cursor: "grab", marginRight: 8 }}>☰</span>
      <input
        type="text"
        placeholder="Label"
        value={field.label}
        onChange={(e) => onChange(field.id, "label", e.target.value)}
        style={{ width: 100, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.min}
        onChange={(e) => onChange(field.id, "min", Number(e.target.value))}
        style={{ width: 60, marginRight: 8 }}
      />
      <input
        type="number"
        value={field.max}
        onChange={(e) => onChange(field.id, "max", Number(e.target.value))}
        style={{ width: 60 }}
      />
      <div style={{ marginLeft: 8, fontSize: 12, color: "#666" }}>
        ({bitCount} bits)
      </div>
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
