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
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableField } from "./SortableField";
import { bitsNeeded } from "./utils";

const DEFAULT_FIELD = {
  label: "",
  min: 0,
  max: 255,
  bitWidth: 8,
  mode: "bits", // or "max"
};

export function BitFieldEditor({ fields, setFields }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleAddField() {
    console.debug("BitFieldEditor: handleAddField", {});
    const newField = { ...DEFAULT_FIELD, id: crypto.randomUUID() };
    setFields([...fields, newField]);
  }

  function handleChange(id, key, value) {
    setFields(
      fields.map((f) =>
        f.id === id ? { ...f, ...(key ? { [key]: value } : value) } : f
      )
    );
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
  );
}
