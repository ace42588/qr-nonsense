import { useState } from "react";
//import ReactJson from "react-json-view";
import Editor from "@monaco-editor/react";
import "../styles/styles.css";

import { encodeJson } from "./utils";

const encodings = [
  { value: "None", label: "Direct JSON" },
  { value: "Alphanumeric", label: "Alphanumeric Only" },
  { value: "PER", label: "Packed Encoding Rule" },
  { value: "PER-ModHex", label: "Packed Encoding Rule, ModHex" },
  { value: "PER-NTRU", label: "Packed Encoding Rule, NTRU" },
];

export function JsonInput({ input, onChange }) {
  console.debug("JsonInput", { input });
  const [value, setValue] = useState(() => {
    try {
      return typeof input?.data === "string"
        ? JSON.parse(input.data)
        : input?.data || { hello: "world" };
    } catch (e) {
      return { hello: "world" };
    }
  });

  const [encoding, setEncoding] = useState("None");

  const handleChange = () => onChange(encodeJson(value, encoding));

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
        <Editor
          height="400px"
          defaultLanguage="json"
          value={JSON.stringify(value, null, 2)}
          onChange={(val) => {
            try {
              const parsed = JSON.parse(val);
              setValue(parsed);
              handleChange();
            } catch (e) {
              // optionally show validation error
            }
          }}
          options={{
            minimap: { enabled: false },
            scrollbar: {
              vertical: "hidden",
              horizontal: "hidden",
            },
            overviewRulerLanes: 0,
            lineNumbers: "off",
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
      {encoding !== "None" && (
        <div>
          <label htmlFor="preview">Preview:</label>
          <pre id="preview">{JSON.stringify(encodeJson(value, encoding)?.data)}</pre>
        </div>
      )}
    </div>
  );
}
