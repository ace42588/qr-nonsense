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
  const { obj = sampleValue, schema, encoding } = input;
  const preview = useParsedInputs()[id];

  const [tab, setTab] = useState("values");
  
  const emitChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  const handleJsonChange = (field, text) => {
    try {
      const parsed = JSON.parse(text);
      emitChange(field, parsed);
    } catch {
      // Invalid JSON; ignore or show error
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
            value={JSON.stringify(obj, null, 2)}
            onChange={(e) => handleJsonChange("obj", e)}
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
            value={schema}
            onChange={(e) => handleJsonChange("schema", e)}
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
        <select id="format" value={encoding} onChange={(e) => emitChange("encoding", e.target.value)}>
          {formats.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {encoding !== "None" && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="preview">Preview:</label>
          <pre id="preview">
            {preview?.data}
          </pre>
        </div>
      )}
    </div>
  );
}
