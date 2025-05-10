import { useState, useEffect } from "react";
import { useInputs, useInputDispatch } from "../../state";
import "../styles/styles.css";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { data, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  const style = {
    border: "1px solid #aaa",
    borderRadius: 8,
    padding: 16,
    maxWidth: 900,
  };

  return (
    <div style={style}>
      <div className="input-group">
        <div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <select
            id="inputMode"
            value={mode}
            onChange={(e) => handleChange("mode", e.target.value)}
          >
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
                onChange={(e) =>
                  handleChange(
                    "encoding",
                    e.target.checked ? "utf-8" : undefined
                  )
                }
              />
            </>
          )}
        </div>
        <div className="input-button-row">
          <input
            type="text"
            value={data}
            onChange={(e) => handleChange("data", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
