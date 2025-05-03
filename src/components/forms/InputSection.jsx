import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css"; // Import your component-specific styles
import { QRInfoInput } from "../qr/QRInfoInput";
import { InputModeSelector } from "../selectors";
import { useQRDataDispatch } from "../../state";

export function InputForm() {
  const [input, setInput] = useState();

  const handleModeChange = (index, { mode, encoding }) => {

  };

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
          {inputs.map((input, index) => (
            <div key={index} className="input-group">
              <InputModeSelector
                mode={input.mode}
                encoding={input.encoding}
                onChange={(e) => handleModeChange(index, e)}
              />
              <div className="input-button-row">
                <input
                  type="text"
                  value={input.data}
                  onChange={(e) => handleInputChange(index, e)}
                  placeholder={`Input ${index + 1}`}
                />
                <button type="button" onClick={() => handleRemoveInput(index)}>
                  ✖
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="button" onClick={handleAddInput}>
            Add Input
          </button>
        </div>
      </div>
    </div>
  );
}