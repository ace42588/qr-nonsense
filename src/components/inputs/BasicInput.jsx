import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ key, input, onChange, onRemove }) {
  const [mode, setMode] = useState(input.byte || "byte");
  const [encoding, setEncoding] = useState(input.encoding || "");
  const [data, setData] = useState(input.data || "");
  
  const handleChange = () => {
    
  }
  
  return (
    <div key={key} className="input-group">
      <div className="label-select-checkbox-row">
        <label htmlFor="inputMode">Input Mode:</label>
        <select
          id="inputMode"
          value={input.mode}
          onChange={(e) => onChange({ ...input, mode: e.target.value })}
        >
          {modes.map((m, idx) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {input.mode === "byte" && (
          <>
            <label htmlFor="forceUtf8">Force UTF-8</label>
            <input
              id="forceUtf8"
              type="checkbox"
              checked={input.encoding === "utf-8"}
              onChange={(e) =>
                onChange({
                  ...input,
                  encoding: e.target.checked ? "utf-8" : undefined,
                })
              }
            />
          </>
        )}
      </div>
      <div className="input-button-row">
        <input
          type="text"
          value={input.data}
          onChange={(e) => onChange({ ...input, data: e.target.value })}
        />
        <button type="button" onClick={onRemove}>
          ✖
        </button>
      </div>
    </div>
  );
}
