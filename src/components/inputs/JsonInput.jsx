import { useState } from "react";
import Editor from "@monaco-editor/react";
import "../styles/styles.css";

import { encodeJson } from "./utils";

const formats = [
  { value: "None", label: "Direct JSON" },
  { value: "Alphanumeric", label: "Alphanumeric Only" },
  { value: "PER", label: "Packed Encoding Rule" },
  { value: "PER-ModHex", label: "Packed Encoding Rule, ModHex" },
  { value: "PER-NTRU", label: "Packed Encoding Rule, NTRU" },
];

export function JsonInput({ input = {}, onChange, fieldMap = {} }) {
  const [value, setValue] = useState(() => {
    try {
      return typeof input.data === "string"
        ? JSON.parse(input.data)
        : input.data ?? { hello: "world" };
    } catch {
      return { hello: "world" };
    }
  });

  const [format, setFormat] = useState("None");

  const emitChange = (obj = value, fmt = format) => {
    const encoded = encodeJson(obj, fmt, fieldMap);
    if (!encoded?.data) return;

    onChange?.({
      type: "json",
      data: encoded.data,
      mode: encoded.mode,
      encoding: encoded.encoding,
    });
  };

  const handleEditorChange = (text) => {
    try {
      const parsed = JSON.parse(text);
      setValue(parsed);
      emitChange(parsed, format);
    } catch {
      // invalid JSON, optional error display
    }
  };

  const handleFormatChange = (e) => {
    const nextFormat = e.target.value;
    setFormat(nextFormat);
    emitChange(value, nextFormat);
  };

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
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
            overviewRulerLanes: 0,
            lineNumbers: "off",
          }}
        />
      </div>

      <div className="label-select-row">
        <label htmlFor="format">Encoding Format:</label>
        <select id="format" value={format} onChange={handleFormatChange}>
          {formats.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {format !== "None" && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="preview">Preview:</label>
          <pre id="preview">
            {JSON.stringify(encodeJson(value, format)?.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
