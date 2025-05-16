import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useParsedInputs, useInputDispatch } from "../../state";
import { predefinedSchemas } from "../../domain/input/serializationSchemas";
import { ENCODING_STRATEGIES } from "../../domain/input/serializationSchemas";
import { TabSwitcher } from "../shared/TabSwitcher";

import "../styles/styles.css";

const formats = [
  { value: "None", label: "Direct JSON" },
  { value: "Alphanumeric", label: "Alphanumeric Only" },
  { value: "PER", label: "Packed Encoding Rule" },
  { value: "PER-ModHex", label: "Packed Encoding Rule, ModHex" },
  { value: "PER-NTRU", label: "Packed Encoding Rule, NTRU" },
];

const options = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
};

export function JsonInput({ id, input }) {
  const { updateInput, updateEncoding, updateSchema } = useInputDispatch();
  const { obj, schema, format } = input;
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
            options={options}
          />
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <Editor
            height="180px"
            defaultLanguage="json"
            value={JSON.stringify(schema, null, 2)}
            onChange={(e) => handleJsonChange("schema", e)}
            options={options}
          />
        </div>
      )}

      <div className="label-select-row">
        <label htmlFor="format">Encoding Format:</label>
        <select
          id="format"
          value={format}
          onChange={(e) => emitChange("format", e.target.value)}
        >
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
          <pre id="preview">{preview?.data}</pre>
        </div>
      )}
    </div>
  );
}
