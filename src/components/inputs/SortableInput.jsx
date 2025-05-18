// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useInputs, useInputDispatch } from "../../state";
import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";
import { MACGenerator } from "./MACGenerator";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

const INPUT_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "json", label: "JSON" },
  { value: "bitfield", label: "BitField" },
  { value: "mac", label: "MAC" },
];

const componentMap = {
  basic: BasicInput,
  byte: BasicInput,
  numeric: BasicInput,
  alphanumeric: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export function SortableInput({ input }) {
  const { id, label, type } = input;
  const { updateInput, removeInput, setType } = useInputDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const [expanded, setExpanded] = useState(true);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  const InputComponent = componentMap[type];

  return (
    <div ref={setNodeRef} {...attributes}>
      <div className="input-button-row">
        <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
          ☰
        </span>
        {expanded ? (
          <>
            <Tabs defaultValue="basic" className="w-half">
        <TabsList>
          {INPUT_TYPES.map(({value, label}) => (<TabsTrigger value={value}>{label}</TabsTrigger>))}
        </TabsList>
              
              {INPUT_TYPES.map(({value}) => (<TabsContent value={value}>
          <InputComponent id={id} input={input} />
        </TabsContent>))}

            <button type="button" onClick={() => removeInput(id)}>
              ✖
            </button>
          </>
        ) : (
          <h3 onClick={() => setExpanded((e) => !e)}>{label}</h3>
        )}
      </div>
      {expanded && <InputComponent id={id} input={input} />}
      {expanded && <p onClick={() => setExpanded((e) => !e)}>Collapse</p>}
    </div>
  );
}
