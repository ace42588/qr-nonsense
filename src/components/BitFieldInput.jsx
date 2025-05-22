import React, { useMemo, useState } from "react";
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
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { useInputs, useInputDispatch, useParsedInputs } from "../state";
import { addBitFieldField } from "../state/inputs/inputActions";

const DEFAULT_FIELD = {
  label: "",
  min: 0,
  max: 255,
  bitWidth: 8,
  type: "base10",
  mode: "bits",
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const encoder = new TextEncoder("utf-8");

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
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 mb-2 p-2 rounded border border-muted"
      style={style}
      {...attributes}
    >
      <span {...listeners} className="cursor-grab text-muted-foreground">
        ☰
      </span>

      <Input
        placeholder="Label"
        value={field.label}
        onChange={(e) => onChange(field.id, "label", e.target.value)}
        className="w-24"
      />

      <Select
        value={field.mode}
        onValueChange={(val) => onChange(field.id, "mode", val)}
      >
        <SelectTrigger className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="max">Max Value</SelectItem>
          <SelectItem value="bits">Bit Width</SelectItem>
        </SelectContent>
      </Select>

      {field.mode === "max" ? (
        <Input
          type="number"
          value={field.max}
          onChange={(e) => onChange(field.id, "max", Number(e.target.value))}
          className="w-20"
        />
      ) : (
        <Input
          type="number"
          value={field.bitWidth}
          onChange={(e) => {
            const bw = Number(e.target.value);
            onChange(field.id, null, {
              bitWidth: bw,
              max: maxFromBits(bw),
            });
          }}
          className="w-20"
        />
      )}

      {field.mode === "max" && (
        <span className="text-xs text-muted-foreground">({bitCount} bits)</span>
      )}

      <Button variant="ghost" size="icon" onClick={() => onRemove(field.id)}>
        ✕
      </Button>
    </div>
  );
}

function BitFieldEditor({ input }) {
  const { dispatch } = useInputDispatch();
  const { fields = [] } = input;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const emitChange = (field, value) =>
    updateInput({ ...input, [field]: value });

  const handleAddField = () => {
    dispatch(addBitFieldField(input.id, {
  ...structuredClone(DEFAULT_FIELD),
  id: crypto.randomUUID(),
}));
  };

  const handleChange = (id, key, value) => {
    emitChange(
      "fields",
      fields.map((f) =>
        f.id === id ? { ...f, ...(key ? { [key]: value } : value) } : f
      )
    );
  };

  const handleRemove = (id) => {
    emitChange(
      "fields",
      fields.filter((f) => f.id !== id)
    );
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    emitChange("fields", arrayMove(fields, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
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

      <Button onClick={handleAddField} variant="secondary">
        + Add Field
      </Button>
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
      case "base10":
        newValue = Number(newValue);
        break;
      case "base16":
        newValue = parseInt(newValue, 16);
        break;
      case "string":
        newValue = encoder.encode(newValue);
        break;
      default:
        newValue = undefined;
    }
    emitChange("values", { ...values, [field.label]: newValue });
  };

  return (
    <div className="space-y-3 mt-2">
      {layout.map((field) => (
        <div key={field.label} className="flex items-center gap-2">
          <label className="w-28">{field.label}</label>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["base10", "base16", "string"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={values[field.label] ?? ""}
            onChange={(e) => handleInputChange(e, field)}
            className="w-24"
          />
        </div>
      ))}
    </div>
  );
}

function BitFieldVisualizer({ id }) {
  const { totalBits, layout = [] } = useParsedInputs()[id];

  return (
    <div className="mt-4">
      <div
        className="flex border rounded overflow-hidden text-white text-xs"
        style={{ height: 30, maxWidth: 600 }}
      >
        {layout.map((field, idx) => {
          const widthPercent = (field.width / totalBits) * 100;
          return (
            <div
              key={field.label}
              className="text-center whitespace-nowrap overflow-hidden"
              title={`${field.label} (${field.width} bits)`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: COLORS[idx % COLORS.length],
                lineHeight: "30px",
              }}
            >
              {field.label}: {field.startBit}→{field.endBit}
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground text-sm mt-2">
        {totalBits} bits total
      </div>
    </div>
  );
}

export function BitFieldInput({ id, input }) {
  const { encodedBytes } = useParsedInputs()[id];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="fields" className="w-full max-w-3xl">
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

      <div className="text-sm mt-2">
        {encodedBytes ? (
          <span>
            <b>Encoded Bytes:</b> {encodedBytes}
          </span>
        ) : (
          <span className="text-destructive">(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}
