// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput} from "./BitFieldInput";
import { INPUT_TYPES } from "./utils";

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


  const handlePrimitiveChange = (payload) => {
    onChange(input.id, { ...payload });
  };

  const handleBitFieldChange = ({ fields: newFields, values: newValues, data }) => {
    onChange(input.id, {
      mode: "byte",
      encoding: "hex",
      data,
      fields: newFields,
      values: newValues,
    });
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="input-button-row">
        <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>☰</span>
        <label htmlFor="inputType">Input Type:</label>
        <select
          id="inputType"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {INPUT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" onClick={() => onRemove(input.id)}>✖</button>
      </div>

      {type === "basic" && (
        <BasicInput input={input.data} onChange={handlePrimitiveChange} />
      )}
      {type === "json" && (
        <JsonInput input={input.data} onChange={handlePrimitiveChange} />
      )}
      {type === "bitField" && (
        <BitFieldInput
          input={{ fields: input.fields, values: input.values }}
          onChange={handleBitFieldChange}
        />
      )}
    </div>
  );
}
