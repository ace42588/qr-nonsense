import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css"; // Import your component-specific styles
import { QRInfoInput } from "../qr/QRInfoInput";
import { InputModeSelector } from "../selectors";
import { useQRDataDispatch } from "../../state";

export function InputForm() {
  const [input, setInput] = useState();
  const [method, setMethod] = useState();

  const handleModeChange = (index, { mode, encoding }) => {};

  return (
    <div className="row">
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      ></div>
    </div>
  );
}
