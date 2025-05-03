import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";

export function BasicInput({ key, input, onChange, onRemove }) {
  const handleInputChange = (e) => onChange({ ...input, data: e.target.value });

  const handleModeChange = (e) => onChange({ ...input, mode: e.target.value });

  const handleEncodingChange = (e) => onChange({
      ...input,
      encoding: e.target.checked ? "utf-8" : undefined,
    });
  };

  return (
    <div key={key} className="input-group">
      <InputModeSelector
        mode={input.mode}
        encoding={input.encoding}
        setMode={handleModeChange}
        setEncoding={handleEncodingChange}
      />
      <div className="input-button-row">
        <input type="text" value={input.data} onChange={handleInputChange} />
        <button type="button" onClick={onRemove}>
          ✖
        </button>
      </div>
    </div>
  );
}

const modes = [
  "numeric",
  "alphanumeric",
  "byte",
  //"kanji",
  "eci",
];

function InputModeSelector({ mode, encoding, setMode, setEncoding }) {
  return (
    <div className="label-select-checkbox-row">
      <label htmlFor="inputMode">Input Mode:</label>
      <select id="inputMode" value={mode} onChange={setMode}>
        {modes.map((m, idx) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {mode === "byte" && (
        <>
          <label htmlFor="forceUtf8">Force UTF-8</label>
          <input
            id="forceUtf8"
            type="checkbox"
            checked={encoding === "utf-8"}
            onChange={setEncoding}
          />
        </>
      )}
    </div>
  );
}
