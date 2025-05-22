import React, { useMemo, useState, useEffect } from "react";

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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

import { useInputs, useInputDispatch, useParsedInputs } from "../state";

const DEFAULT_FIELD = {
  label: "",
  min: 0,
  max: 255,
  bitWidth: 8,
  type: "base10",
  mode: "bits", // or "max"
};

const encoder = new TextEncoder("utf-8");

const types = [
  { value: "base10", label: "Dec" },
  { value: "base16", label: "Hex" },
  { value: "string", label: "String" },
];

// Color palette (cycle through for each field)
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function maxFromBits(bits) {
  return Math.pow(2, bits) - 1;
}

function SortableField({ field, onChange, onRemove }) {
  
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
            onChange(field.id, null, {
              bitWidth: bw,
              max: maxFromBits(bw),
            });
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

function BitFieldEditor({ input }) {
  const { updateInput } = useInputDispatch();
  const { fields = [] } = input;
  
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

function BitFieldValues({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { values = {}, layout = [] } = useParsedInputs()[id];
  const [type, setType] = useState("base10");

  const emitChange = (field, value) =>
    updateInput({ ...input, [field]: value });

  const handleInputChange = (e, field) => {
    let newValue = e.target.value;
    switch (type) {
      case "base10": {
        newValue = Number(newValue);
        break;
      }
      case "base16": {
        newValue = parseInt(newValue, 16);
        break;
      }
      case "string": {
        newValue = encoder.encode(newValue);
        break;
      }
      default: {
        newValue = undefined;
      }
    }
    const newValues = {
      ...values,
      [field.label]: newValue,
    };
    //console.debug("BitFieldValues: handleInputChange", { newValues });
    emitChange("values", {
      ...values,
      [field.label]: newValue,
    });
  };

  return (
    <>
      {layout.map((field) => (
        <div
          key={field.label}
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            justifyContent: "space-between",
          }}
        >
          <label style={{ marginRight: 8, minWidth: 100 }}>{field.label}</label>
          <select
            id="fieldType"
            value={field.type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={values[field.label] ?? ""}
            onChange={(e) => handleInputChange(e, field)}
            style={{ maxWidth: 100 }}
          />
        </div>
      ))}
    </>
  );
}

function BitFieldVisualizer({ id, input }) {
  const { totalBits, layout = [] } = useParsedInputs()[id];

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          height: 30,
          width: "100%",
          maxWidth: 600,
          border: "1px solid #ccc",
          borderRadius: 6,
          overflow: "hidden",
          fontSize: 10,
          lineHeight: "30px",
        }}
      >
        {layout.map((field, idx) => {
          const widthPercent = (field.width / totalBits) * 100;
          const color = COLORS[idx % COLORS.length];

          return (
            <div
              key={field.label}
              title={`${field.label} (${field.width} bits)`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: color,
                color: "white",
                textAlign: "center",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {field.label}: {field.startBit}→{field.endBit}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
        {totalBits} bits total
      </div>
    </div>
  );
}

export function BitFieldInput({ id, input }) {
  const { encodedBytes } = useParsedInputs()[id];

  return (
    <div>
      <Tabs defaultValue="fields" className="w-half">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <BitFieldEditor id={id} input={input} />
        </TabsContent>

        <TabsContent value="values">
          <BitFieldValues id={id} input={input} />
        </TabsContent>
      </Tabs>

      <BitFieldVisualizer id={id} input={input} />
      <div style={{ marginTop: 8 }}>
        {encodedBytes ? (
          <>
            <b>Encoded Bytes:</b> {encodedBytes}
          </>
        ) : (
          <span style={{ color: "red" }}>(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}
