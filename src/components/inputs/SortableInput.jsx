// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";
import { MACGenerator } from "./MAC";

import { TabSwitcher } from "../shared/TabSwitcher";

const INPUT_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "json", label: "JSON" },
  { value: "bitField", label: "BitField" },
  { value: "mac", label: "MAC" },
];

export function SortableInput({ input, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: input.id });

  const [tab, setTab] = useState("basic");
  const [expanded, setExpanded] = useState(true);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: "1px solid #aaa",
    borderRadius: 8,
    padding: 16,
    maxWidth: 900,
    marginBottom: 8,
  };

  const handleChange = (payload) => {
    onChange(input.id, { ...payload });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="input-button-row">
        <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
          ☰
        </span>
        {expanded ? (
          <>
            <TabSwitcher options={INPUT_TYPES} active={tab} onChange={setTab} />
            <button type="button" onClick={() => onRemove(input.id)}>
              ✖
            </button>
          </>
        ) : (
          <h3 onClick={() => setExpanded((e) => !e)}>
            {input.label}
          </h3>
        )}
      </div>

      {expanded && tab === "basic" && (
        <BasicInput input={input.data} onChange={handleChange} />
      )}
      {expanded && tab === "json" && (
        <JsonInput input={input.data} onChange={handleChange} />
      )}
      {expanded && tab === "bitField" && (
        <BitFieldInput
          input={{ fields: input.fields, values: input.values }}
          onChange={handleChange}
        />
      )}
      {expanded && tab === "mac" && (
        <MACGenerator input={input.data} onChange={handleChange}/>
      )}
      {expanded && <p onClick={() => setExpanded((e) => !e)}>Collapse</p>}
    </div>
  );
}
