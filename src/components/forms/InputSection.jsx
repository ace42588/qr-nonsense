import { useState } from "react";
import "../styles/styles.css";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

const types = ["basic", "json", "bitField"];

export function InputSection({ onChange, onRemove }) {
  const [type, setType] = useState("basic");
  const [fields, setFields] = useState([
    { id: "0", label: "label", min: 0, max: 255 },
  ]);
  const [values, setValues] = useState({});
  const [input, setInput] = useState("");
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
          <label htmlFor="inputMode">Input Type:</label>
          <select
            id="inputMode"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((t, idx) => (
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
          <BasicInput initial={input} onChange={setInput} />
        )}
        {type === "json" && (
          <JsonInput initial={input} onChange={setInput} />
        )}
        {type === "bitField" && (
          <BitFieldSection
            title="BitField"
            fields={fields}
            setFields={setFields}
            sampleValues={values}
          />
        )}
      </div>
    </div>
  );
}
