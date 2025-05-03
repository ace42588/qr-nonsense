import { useEffect, useState } from "react";
import "../styles/styles.css";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

const types = ["basic", "json", "bitField"];

export function InputSection({ initial, onChange, onRemove }) {
  //console.debug("InputSection", { initial, onChange, onRemove });
  const [type, setType] = useState("basic");
  const [fields, setFields] = useState([
    { id: "0", label: "label", min: 0, max: 255 },
  ]);
  const [values, setValues] = useState({});
  const [input, setInput] = useState(initial || "");

  const handleBasicOrJsonChange = (newInput) => {
    setInput(newInput);
    onChange?.(newInput);
  };

  const handleFieldsChange = (newFields) => {
    setFields(newFields);
    onChange?.({ fields: newFields, values });
  };

  const handleValuesChange = (newValues) => {
    setValues(newValues);
    onChange?.({ fields, values: newValues });
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
            {types.map((t) => (
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
          <BasicInput input={input} onChange={handleBasicOrJsonChange} />
        )}
        {type === "json" && (
          <JsonInput input={input} onChange={handleBasicOrJsonChange} />
        )}
        {type === "bitField" && (
          <BitFieldSection
            title="BitField"
            fields={fields}
            setFields={handleFieldsChange}
            values={values}
            setValues={handleValuesChange}
          />
        )}
      </div>
    </div>
  );
}
