// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useInputDispatch } from "../../state";
import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";
import { MACGenerator } from "./MACGenerator";

import { TabSwitcher } from "../shared/TabSwitcher";

const INPUT_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "json", label: "JSON" },
  { value: "bitField", label: "BitField" },
  { value: "mac", label: "MAC" },
];

const componentMap = {
  "basic": BasicInput,
  "json": JsonInput,
  "bitField": BitFieldInput,
  "mac": MACGenerator
};

export function SortableInput({ id, label }) {
  const {  removeInput } =
    useInputDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id});

  const [type, setType] = useState("basic");
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
  const InputComponent = componentMap[type];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="input-button-row">
        <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
          ☰
        </span>
        {expanded ? (
          <>
            <TabSwitcher options={INPUT_TYPES} active={type} onChange={setType} />
            <button type="button" onClick={() => removeInput(id)}>
              ✖
            </button>
          </>
        ) : (
          <h3 onClick={() => setExpanded((e) => !e)}>
            {label}
          </h3>
        )}
      </div>
      {expanded && <InputComponent id={id}/>}
      {expanded && <p onClick={() => setExpanded((e) => !e)}>Collapse</p>}
    </div>
  );
}
