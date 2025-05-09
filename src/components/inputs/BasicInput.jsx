import { useState, useEffect } from "react";
import { useInputs, useInputDispatch, useEncodedInputs } from "../../state";
import "../styles/styles.css";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ id }) {
  console.debug("BasicInput", { id })
  const inputs = useInputs();
  const {updateInput} = useInputDispatch();
  const previews = useEncodedInputs();

  const input = inputs.find(i => i.id === id);
  const preview = previews[id];
  
  const handleDataChange = (e) => {
    updateInput?.({ ...input, data: e.target.value });
  };

  const handleModeChange = (e) => {
    updateInput?.({ ...input, mode: e.target.value });
  };

  const handleEncodingChange = (e) => {
    updateInput?.({
      ...input,
      encoding: e.target.checked ? "utf-8" : undefined,
    });
  };
  
  const style ={
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }

  return (
    <div style={style}>
      <div className="input-group">
        <div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <select
            id="inputMode"
            value={input.mode}
            onChange={handleModeChange}
          >
            {modes.map((m) => (
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
                onChange={handleEncodingChange}
              />
            </>
          )}
        </div>
        <div className="input-button-row">
          <input type="text" value={input.data} onChange={handleDataChange} />
        </div>
      </div>
    </div>
  );
}

