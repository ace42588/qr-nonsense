import { useState } from "react";
import "../styles/styles.css";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ key, initial, onChange, onRemove }) {
  const [mode, setMode] = useState(initial.byte || "byte");
  const [encoding, setEncoding] = useState(initial.encoding || "");
  const [data, setData] = useState(initial.data || "");

  const handleDataChange = (e) => {
    const newData = e.target.value;
    setData(newData);
    onChange({ data: newData, mode, encoding });
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    onChange({ data, mode: newMode, encoding });
  };

  const handleEncodingChange = (e) => {
    const newEncoding = e.target.checked ? "utf-8" : undefined;
    setEncoding(newEncoding);
    onChange({ data, mode, encoding: newEncoding });
  };

  return (
    <div key={key} className="input-group">
      <div className="label-select-checkbox-row">
        <label htmlFor="inputMode">Input Mode:</label>
        <select id="inputMode" value={mode} onChange={handleModeChange}>
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
              onChange={handleEncodingChange}
            />
          </>
        )}
      </div>
      <div className="input-button-row">
        <input type="text" value={data} onChange={handleDataChange} />
        <button type="button" onClick={onRemove}>
          ✖
        </button>
      </div>
    </div>
  );
}
