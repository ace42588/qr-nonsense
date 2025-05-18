import { useState, useEffect } from "react";
import { useInputs, useInputDispatch } from "../../state";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function BasicInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <div>
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
            value={text}
            onChange={(e) => handleChange("text", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
