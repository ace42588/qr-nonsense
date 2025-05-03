import { useState } from "react";
import "../styles/styles.css";

import { encodeJson } from "./utils";

const encodings = [
  { value: "None", label: "Direct JSON" },
  { value: "Alphanumeric", label: "Alphanumeric Only" },
  { value: "PER", label: "Packed Encoding Rule" },
  { value: "PER-ModHex", label: "Packed Encoding Rule, ModHex" },
  { value: "PER-NTRU", label: "Packed Encoding Rule, NTRU" },
];

export function JsonInput({ key, initial, onChange }) {
  const [input, setInput] = useState(initial);
  const [encoding, setEncoding] = useState("PER");

  const handleChange = () => onChange(encodeJson(input, encoding));

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
          onChange={(e) => {
            setInput(e.target.value);
            handleChange();
          }}
        />
      </div>
      <div className="label-select-row">
        <label htmlFor="encoding">Encoding:</label>
        <select
          id="encoding"
          value={encoding}
          onChange={(e) => {
            setEncoding(e.target.value);
            handleChange();
          }}
        >
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
