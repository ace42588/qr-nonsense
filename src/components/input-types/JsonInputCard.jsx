// External Libraries
import Editor from "@monaco-editor/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// State and Actions
import {
  updateJsonObject,
  updateSchema,
  updateEncoding,
  setSchemaName,
} from "@/state/inputs/inputActions";

// Domain
import { predefinedSchemas } from "@/domain/input/index";
import { ENCODING_STRATEGIES } from "@/domain/encoders";
import { MONACO_EDITOR_OPTIONS } from "./constants";

export function JsonInputCard({ input, preview, dispatch }) {
  return (
    <Card className="h-full w-full">
      <CardHeader className="pb-3">
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
                value={JSON.stringify(input.obj, null, 2)}
                onChange={(text) => {
                  try {
                    dispatch(updateJsonObject(input.id, JSON.parse(text)));
                  } catch {}
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
                  dispatch(updateSchema(input.id, predefinedSchemas[name]));
                  dispatch(setSchemaName(input.id, name));
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
                value={JSON.stringify(input.schema, null, 2)}
                onChange={(text) => {
                  try {
                    dispatch(updateSchema(input.id, JSON.parse(text)));
                  } catch {}
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
            value={input.encoding || "None"}
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
      </CardContent>
    </Card>
  );
}
