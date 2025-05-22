import { useState, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useParsedInputs, useInputs, useInputDispatch } from "../state";
import {
  updateJsonObject,
  updateSchema,
  updateEncoding,
  updateSchemaName,
  setMacKey,
  setMacAlgorithm,
  setIncludedFields,
} from "../state/inputs/inputActions";
import { predefinedSchemas } from "../domain/input";
import { MAC_FUNCTIONS } from "../domain";
import { ENCODING_STRATEGIES } from "../domain/encoders";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Label, Separator, ScrollArea, Input, Card, CardContent, CardHeader, CardTitle, Checkbox
} from "../components/ui";

const editorOptions = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
};

export function JsonInput({ id, input }) {
  const dispatch = useInputDispatch();
  const { obj, schema, format } = input;
  const preview = useParsedInputs()[id];
  const [tab, setTab] = useState("values");

  const handleJsonChange = (field, text) => {
    try {
      const parsed = JSON.parse(text);
      if (field === "obj") dispatch(updateJsonObject(id, parsed));
      if (field === "schema") dispatch(updateSchema(id, parsed));
    } catch {
      // Optionally show error
    }
  };

  const handleSchemaSelect = (name) => {
    dispatch(updateSchema(id, predefinedSchemas[name]));
    dispatch(updateSchemaName(id, name));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={tab} onValueChange={setTab} className="w-full max-w-3xl">
        <TabsList>
          <TabsTrigger value="json">Values</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(obj, null, 2)}
            onChange={(e) => handleJsonChange("obj", e)}
            options={editorOptions}
          />
        </TabsContent>

        <TabsContent value="schema" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="schema-select">Predefined Schema</Label>
            <Select
              value={input.schemaName}
              onValueChange={handleSchemaSelect}
            >
              <SelectTrigger id="schema-select" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(predefinedSchemas).map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(schema, null, 2)}
            onChange={(e) => handleJsonChange("schema", e)}
            options={editorOptions}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="encoding-select">Encoding</Label>
        <Select
          value={input.encoding}
          onValueChange={(val) => dispatch(updateEncoding(id, val))}
        >
          <SelectTrigger id="encoding-select" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENCODING_STRATEGIES.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {format !== "None" && (
        <div className="space-y-2">
          <Label htmlFor="preview">Preview</Label>
          <ScrollArea className="border rounded p-2 max-h-48 bg-muted text-sm whitespace-pre-wrap">
            <pre id="preview">{preview?.data}</pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}