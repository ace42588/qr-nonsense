import { useState } from "react";
import "../styles/styles.css";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

const types = ["basic", "json", "bitField"];

export function InputSection({ onChange, onRemove }) {
  const [type, setType] = useState();
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
        <label htmlFor="inputMode">Input Mode:</label>
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
      {type === "basic" && (<BasicInput />)}
      {type === "json" && (<JsonInput />)}
      {type === "json" && (<JsonInput />)}
    </div>
  );
}
