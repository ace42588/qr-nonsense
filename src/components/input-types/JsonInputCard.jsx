// External Libraries
import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ErrorBanner } from "@/components/ui/message-banner";

// State and Actions
import {
  updateJsonObject,
  updateSchema,
  updateEncoding,
  setSchemaName,
  updateInput,
} from "@/state/inputs/inputActions";

// Domain
import { predefinedSchemas } from "@/domain/input/index";
import { ENCODING_STRATEGIES, resolveEncodingStrategy } from "@/domain/encoders";
import { MONACO_EDITOR_OPTIONS } from "./constants";

export function JsonInputCard({ input, preview, dispatch, parseError }) {
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(input.obj ?? {}, null, 2)
  );
  const [schemaText, setSchemaText] = useState(() =>
    JSON.stringify(input.schema ?? {}, null, 2)
  );
  const [jsonError, setJsonError] = useState(null);
  const [schemaError, setSchemaError] = useState(null);

  useEffect(() => {
    setJsonText(JSON.stringify(input.obj ?? {}, null, 2));
    setJsonError(null);
    setSchemaText(JSON.stringify(input.schema ?? {}, null, 2));
    setSchemaError(null);
  }, [input.id]);

  const encodingValue = resolveEncodingStrategy(input.encoding || "None");
  const displayError = jsonError || schemaError || parseError || input.error;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">{input.label}</h3>
      {displayError && <ErrorBanner message={displayError} title="Parse error" />}
      <Tabs defaultValue="json" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="json" className="flex-1">Values</TabsTrigger>
          <TabsTrigger value="schema" className="flex-1">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4 min-h-[200px]">
          <div className="relative h-full w-full rounded-md border">
            <Editor
              height="200px"
              defaultLanguage="json"
              value={jsonText}
              onChange={(text) => {
                const next = text ?? "";
                setJsonText(next);
                try {
                  dispatch(updateJsonObject(input.id, JSON.parse(next)));
                  setJsonError(null);
                  if (input.error) {
                    dispatch(updateInput(input.id, { error: undefined }));
                  }
                } catch (err) {
                  const message = `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`;
                  setJsonError(message);
                  dispatch(updateInput(input.id, { error: message }));
                }
              }}
              options={MONACO_EDITOR_OPTIONS}
            />
          </div>
        </TabsContent>

        <TabsContent value="schema" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="schema-select">Predefined Schema</Label>
            <Select
              value={input.schemaName}
              onValueChange={(name) => {
                const schema = predefinedSchemas[name];
                dispatch(updateSchema(input.id, schema));
                dispatch(setSchemaName(input.id, name));
                setSchemaText(JSON.stringify(schema ?? {}, null, 2));
                setSchemaError(null);
              }}
            >
              <SelectTrigger id="schema-select" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(predefinedSchemas).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative h-full w-full rounded-md border">
            <Editor
              height="200px"
              defaultLanguage="json"
              value={schemaText}
              onChange={(text) => {
                const next = text ?? "";
                setSchemaText(next);
                try {
                  dispatch(updateSchema(input.id, JSON.parse(next)));
                  setSchemaError(null);
                } catch (err) {
                  setSchemaError(
                    `Invalid schema JSON: ${err instanceof Error ? err.message : String(err)}`
                  );
                }
              }}
              options={MONACO_EDITOR_OPTIONS}
              className="overflow-hidden rounded-md"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="space-y-2">
        <Label>Encoding</Label>
        <Select
          value={encodingValue}
          onValueChange={(val) => dispatch(updateEncoding(input.id, val))}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENCODING_STRATEGIES.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preview?.data && (
        <div className="space-y-2">
          <Label htmlFor="preview">Preview</Label>
          <ScrollArea className="h-24 w-full rounded-md border bg-muted p-4">
            <pre className="text-sm" id="preview">{preview.data}</pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
