import { useState, useEffect } from "react";
import { useInputs, useInputDispatch } from "../../state";

import { QRModeSelect } from "./qr-mode-select";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function StringInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <div>
      <div className="input-group">
        
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
