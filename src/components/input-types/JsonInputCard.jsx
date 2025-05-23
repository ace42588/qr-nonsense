import Editor from "@monaco-editor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  updateJsonObject,
  updateSchema,
  updateEncoding,
  setSchemaName,
} from "../../state/inputs/inputActions";
import { predefinedSchemas } from "../../domain/input";
import { ENCODING_STRATEGIES, MONACO_EDITOR_OPTIONS } from "./constants";

export function JsonInputCard({ input, preview, dispatch }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid w-full items-center gap-4">
          <Tabs defaultValue="json" className="w-full max-w-3xl">
            <TabsList>
              <TabsTrigger value="json">Values</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="json" className="mt-4">
              <div className="w-full max-w-full overflow-hidden space-y-4">
                <Editor
                  height="300px"
                  width="100%"
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
                  <SelectTrigger id="schema-select" className="w-64">
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
              <div className="w-full max-w-full overflow-hidden space-y-4">
                <Editor
                  height="300px"
                  width="100%"
                  defaultLanguage="json"
                  value={JSON.stringify(input.schema, null, 2)}
                  onChange={(text) => {
                    try {
                      dispatch(updateSchema(input.id, JSON.parse(text)));
                    } catch {}
                  }}
                  options={MONACO_EDITOR_OPTIONS}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="space-y-2">
            <Label>Encoding</Label>
            <Select
              value={input.encoding}
              onValueChange={(val) => dispatch(updateEncoding(input.id, val))}
            >
              <SelectTrigger className="w-64">
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

          {input.format !== "None" && (
            <div className="space-y-2 w-full">
              <Label htmlFor="preview">Preview</Label>
              <ScrollArea className="border rounded p-2 bg-muted text-sm whitespace-pre-wrap max-h-48 w-full overflow-auto">
                <pre id="preview">{preview?.data}</pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
