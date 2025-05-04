import { useState, useEffect } from "react";
import "../styles/styles.css";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ input = "", onChange }) {
  const [mode, setMode] = useState("byte");
  const [encoding, setEncoding] = useState(undefined);
  const [data, setData] = useState(input);

  useEffect(() => {
    // ensure parent receives the correct initial state
    onChange?.({ mode, encoding, data });
  }, []);

  const emitChange = (updated = {}) => {
    onChange?.({
      mode: updated.mode ?? mode,
      encoding: updated.encoding ?? encoding,
      data: updated.data ?? data,
    });
  };

  const handleDataChange = (e) => {
    const newData = e.target.value;
    setData(newData);
    emitChange({ data: newData });
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    emitChange({ mode: newMode });
  };

  const handleEncodingChange = (e) => {
    const newEncoding = e.target.checked ? "utf-8" : undefined;
    setEncoding(newEncoding);
    emitChange({ encoding: newEncoding });
  };

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <div className="input-group">
        <div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <select id="inputMode" value={mode} onChange={handleModeChange}>
            {modes.map((m) => (
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
        </div>
      </div>
    </div>
  );
}
