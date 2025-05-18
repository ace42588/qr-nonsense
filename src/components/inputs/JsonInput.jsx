import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useParsedInputs, useInputDispatch } from "../../state";
import { predefinedSchemas } from "../../domain/input";
import { ENCODING_STRATEGIES } from "../../domain/encoders";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

const options = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
};

export function JsonInput({ id, input }) {
  const { updateInput, updateEncoding, updateSchema, updateSchemaName } =
    useInputDispatch();
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

  const handleSchemaSelect = (e) => {
    const name = e.target.value;
    const schema = predefinedSchemas[name];
    updateSchema(id, schema);
    updateSchemaName(id, name);
  };

  const handleCustomSchemaChange = (schema) => {
    updateSchema(id, schema);
    updateSchemaName("custom");
  };

  return (
    <div>
      <Tabs defaultValue="json" className="w-half">
        <TabsList>
          <TabsTrigger value="json">Values</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="json">
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(obj, null, 2)}
            onChange={(e) => handleJsonChange("obj", e)}
            options={options}
          />
        </TabsContent>

        <TabsContent value="schema">
          <label>Schema</label>
          <select value={input.schemaName} onChange={handleSchemaSelect}>
            {Object.entries(predefinedSchemas).map(([name]) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Editor
            height="180px"
            defaultLanguage="json"
            value={JSON.stringify(schema, null, 2)}
            onChange={(e) => handleJsonChange("schema", e)}
            options={options}
          />
        </TabsContent>
      </Tabs>

      <label>Encoding</label>
      <select
        value={input.encoding}
        onChange={(e) => updateEncoding(id, e.target.value)}
      >
        {ENCODING_STRATEGIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {format !== "None" && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="preview">Preview:</label>
          <pre id="preview">{preview?.data}</pre>
        </div>
      )}
    </div>
  );
}
