// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";

const INPUT_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "json", label: "JSON" },
  { value: "bitField", label: "BitField" },
  { value: "mac", label: "MAC" },
];

export function SortableInput({ input, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: input.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #aaa",
    borderRadius: 8,
    padding: 16,
    maxWidth: 900,
    marginBottom: 8,
  };

  const [type, setType] = useState(input.type);
  const [tab, setTab] = useState("basic");

  const handleChange = (payload) => {
    onChange(input.id, { ...payload });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="input-button-row">
        <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
          ☰
        </span>
        <label htmlFor="inputType">Input Type:</label>
        <select
          id="inputType"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {INPUT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <TabSwitcher
        options={INPUT_TYPES}
        active={tab}
        onChange={setTab}
      />
        <button type="button" onClick={() => onRemove(input.id)}>
          ✖
        </button>
      </div>

      {tab === "basic" && (
        <BasicInput input={input.data} onChange={handleChange} />
      )}
      {tab === "json" && (
        <JsonInput input={input.data} onChange={handleChange} />
      )}
      {type === "bitField" && (
        <BitFieldInput
          input={{ fields: input.fields, values: input.values }}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
