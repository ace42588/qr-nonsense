import { useMemo, useState } from "react";
import "../styles/styles.css";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

const INPUT_TYPES = ["basic", "json", "bitField"];

function inferType(initial) {
  if (initial?.type && INPUT_TYPES.includes(initial.type)) return initial.type;
  if (initial?.fields && initial?.values) return "bitField";
  if (typeof initial?.data === "object") return "json";
  if (typeof initial?.data === "string") {
    try {
      JSON.parse(initial.data);
      return "json";
    } catch {
      return "basic";
    }
  }
  return "basic";
}

export function InputSection({ initial = {}, onChange, onRemove }) {
  const inferredType = useMemo(() => inferType(initial), [initial]);

  const [type, setType] = useState(initial.type || "basic");
  const [fields, setFields] = useState(
    initial.fields || [{ id: "0", label: "label", min: 0, max: 255 }]
  );
  const [values, setValues] = useState(initial.values || {});
  const [input, setInput] = useState(initial.data || "");

  const handlePrimitiveChange = (newInput) => {
    setInput(newInput.data);
    onChange?.({ type, ...newInput });
  };

  const handleBitFieldChange = ({
    fields: newFields,
    values: newValues,
    data,
  }) => {
    setFields(newFields);
    setValues(newValues);
    onChange?.({
      type: "bitField",
      mode: "byte",
      encoding: "hex",
      data,
      fields: newFields,
      values: newValues,
    });
  };

  return (
    <div className="row">
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <div className="input-button-row">
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
          <button type="button" onClick={onRemove}>
            ✖
          </button>
        </div>

        {type === "basic" && (
          <BasicInput input={input} onChange={handlePrimitiveChange} />
        )}
        {type === "json" && (
          <JsonInput input={input} onChange={handlePrimitiveChange} />
        )}
        {type === "bitField" && (
          <BitFieldSection
            fields={fields}
            setFields={setFields}
            values={values}
            onChange={handleBitFieldChange}
          />
        )}
      </div>
    </div>
  );
}
