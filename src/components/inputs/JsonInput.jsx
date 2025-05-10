import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useParsedInputs, useInputDispatch } from "../../state";
import "../styles/styles.css";

//import { encodeJson } from "./utils";
import { TabSwitcher } from "../shared/TabSwitcher";

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
    { v: 5432, q: 1 },
    { v: 6666, q: 3 },
    { v: 1234, q: 2 },
  ],
};

export function JsonInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { obj, schema, encoding } = input;
  const preview = useParsedInputs()[id];

  const [tab, setTab] = useState("values");
  
  const emitChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  const handleEditorChange = (text) => {
    try {
      const parsed = JSON.parse(text);
      emitChange("obj", parsed);
    } catch {
      // Invalid JSON; ignore or show error
    }
  };

  const handleFormatChange = (e) => {
    const next = e.target.value;
    emitChange("encoding", next);
  };

  const handleFieldMapChange = (text) => {
    try {
      const parsed = JSON.parse(text);
      emitChange(value, format, parsed);
    } catch {
      // invalid field map; ignore
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
      <TabSwitcher
        options={[
          { value: "fields", label: "Schema" },
          { value: "values", label: "JSON" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "values" ? (
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
      ) : (
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
