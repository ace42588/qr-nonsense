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
import { useEncodedInputs, useInputs, useInputDispatch } from "../../state";

const DEFAULT_FIELD = {
  label: "",
  min: 0,
  max: 255,
  bitWidth: 8,
  type: "base10",
  mode: "bits", // or "max"
};

export function BitFieldEditor({ id }) {
  const inputs = useInputs();
  const { updateInput } = useInputDispatch();
  const previews = useEncodedInputs();

  const input = inputs.find((i) => i.id === id);
  const { fields } = input;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const emitChange = (field, value) =>
    updateInput({ ...input, [field]: value });

  function handleAddField() {
    const newField = { ...DEFAULT_FIELD, id: crypto.randomUUID() };
    emitChange("fields", [...fields, newField]);
  }

  function handleChange(id, key, value) {
    emitChange(
      "fields",
      fields.map((f) =>
        f.id === id ? { ...f, ...(key ? { [key]: value } : value) } : f
      )
    );
  }

  function handleRemove(id) {
    emitChange(
      "fields",
      fields.filter((f) => f.id !== id)
    );
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      emitChange("fields", arrayMove(fields, oldIndex, newIndex));
    }
  }

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
