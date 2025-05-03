import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { InputModeSelector } from "../selectors";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";

export function BasicInput({ input, setInput, handleRemove }) {
  const handleInputChange = (event) => {
    const newInput = {...input, data: event.target.value};
    setInput(newInput);
  };

  const handleModeChange = ({ mode, encoding }) => {
    const newInput = { ...input, mode, encoding };
    setInput(newInput);
  };

  return (
    <div className="input-group">
      <InputModeSelector
        mode={input.mode}
        encoding={input.encoding}
        onChange={(e) => handleModeChange(e)}
      />
      <div className="input-button-row">
        <input
          type="text"
          value={input.data}
          onChange={(e) => handleInputChange(e)}
        />
        <button type="button" onClick={handleRemove}>
          ✖
        </button>
      </div>
    </div>
  );
}
