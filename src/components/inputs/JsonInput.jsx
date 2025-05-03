import { useState, useContext, useEffect, useCallback } from "react";
import { QRInfoInput } from "../qr/QRInfoInput";
import "../styles/styles.css";

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  EncodingSelector,
} from "../selectors";

import { encodeJson } from "./utils";

const encodings = [
  { value: "JSON", label: "Direct JSON" },
  { value: "Alphanumeric", label: "Alphanumeric Only" },
  { value: "PER", label: "Packed Encoding Rule" },
  { value: "PER-ModHex", label: "Packed Encoding Rule, ModHex" },
  { value: "PER-NTRU", label: "Packed Encoding Rule, NTRU" },
];

export function MerchForm({ key, initial, onChange, onRemove }) {
  const [input, setInput] = 
  const [encoding, setEncoding] = useState("PER");

  const handleInputChange = (event) => {
    const newInput = { ...input, data: event.target.value };
    onChange(newInput);
  };

  const handleEncodingChange = (event) => {
    const newInput = { ...input, mode, encoding };
    setEncoding;
    onChange(newInput);
  };
  
  const handleChange = (inputValue = input, encodingValue = encoding) => {
    const encoded = (inputValue, encodingValue);
    onChange(encoded);
  }

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <div key={key} className="input-group">
        <textarea
          type="text"
          rows={16}
          value={input}
          onChange={(e) => onChange(encodeJson(e.target.value, encoding))}
        />
      </div>
      <div className="label-select-row">
        <label htmlFor="encoding">Encoding:</label>
        <select id="encoding" value={encoding} onChange={(e) => setEncoding}>
          {encodings.map((encoding, idx) => (
            <option key={encoding.value} value={encoding.value}>
              {encoding.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
