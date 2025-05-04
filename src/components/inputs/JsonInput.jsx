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

const defaultFieldMap = {
  transactionKey: "txn",
  conferenceKey: "cc",
  platformKey: "p",
  itemsKey: "i",
  variantKey: "v",
  quantityKey: "q",
};

const sampleValue = {
  p: "A",
  cc: 133,
  txn: "99999",
  i: [
    {
      v: 5432,
      q: 1,
    },
    {
      v: 6666,
      q: 3,
    },
    {
      v: 1234,
      q: 2,
    },
  ],
};

export function JsonInput({ input = {}, onChange, fieldMap: initialMap = {} }) {
  const [value, setValue] = useState(() => {
    try {
      return typeof input.data === "string"
        ? JSON.parse(input.data)
        : input.data ?? sampleValue;
    } catch {
      return sampleValue;
    }
  });

  const [format, setFormat] = useState("None");
  const [fieldMap, setFieldMap] = useState({
    ...defaultFieldMap,
    ...initialMap,
  });
  const [fieldMapRaw, setFieldMapRaw] = useState(
    JSON.stringify(fieldMap, null, 2)
  );
  const [mapVisible, setMapVisible] = useState(false);
  const [valuesVisible, setValuesVisible] = useState(true);

  const emitChange = (obj = value, fmt = format, map = fieldMap) => {
    const encoded = encodeJson(obj, fmt, map);
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
      emitChange(parsed, format, fieldMap);
    } catch {
      // Optionally show error
    }
  };

  const handleFormatChange = (e) => {
    const next = e.target.value;
    setFormat(next);
    emitChange(value, next, fieldMap);
  };

  const handleFieldMapChange = (text) => {
    setFieldMapRaw(text);
    try {
      const parsed = JSON.parse(text);
      setFieldMap(parsed);
      emitChange(value, format, parsed);
    } catch {
      // Ignore until valid JSON
    }
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
      <div>
        <p onClick={() => setMapVisible((v) => !v)}>
          {mapVisible ? "▾ Field Map" : "▸ Field Map"}
        </p>
        {mapVisible && (
          <div style={{ marginTop: 8 }}>
            <Editor
              height="180px"
              defaultLanguage="json"
              value={fieldMapRaw}
              onChange={handleFieldMapChange}
              options={{
                minimap: { enabled: false },
                scrollbar: { vertical: "hidden", horizontal: "hidden" },
                overviewRulerLanes: 0,
                lineNumbers: "off",
              }}
            />
          </div>
        )}
      </div>

      <p onClick={() => setValuesVisible((v) => !v)}>
        {valuesVisible ? "▾ Value" : "▸ Value"}
      </p>
      {valuesVisible && (
        <div style={{ marginTop: 8 }}>
          <Editor
            height="300px"
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
      )}

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
            {JSON.stringify(encodeJson(value, format, fieldMap)?.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
