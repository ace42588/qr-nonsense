import Editor from "@monaco-editor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ENCODING_STRATEGIES } from "../../domain/encoders";

const editorOptions = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
};

export function JsonInputCard({ input, preview, dispatch }) {
  return (
    <Card>
      <CardHeader><CardTitle>{input.label}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2">
          <Label>Values</Label>
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.obj, null, 2)}
            onChange={(text) => {
              try {
                dispatch(updateJsonObject(input.id, JSON.parse(text)));
              } catch {}
            }}
            options={editorOptions}
          />
        </div>

        <div className="space-y-2">
          <Label>Predefined Schema</Label>
          <Select
            value={input.schemaName}
            onValueChange={(name) => {
              dispatch(updateSchema(input.id, predefinedSchemas[name]));
              dispatch(setSchemaName(input.id, name));
            }}
          >
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(predefinedSchemas).map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.schema, null, 2)}
            onChange={(text) => {
              try {
                dispatch(updateSchema(input.id, JSON.parse(text)));
              } catch {}
            }}
            options={editorOptions}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Encoding</Label>
          <Select
            value={input.encoding}
            onValueChange={(val) => dispatch(updateEncoding(input.id, val))}
          >
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENCODING_STRATEGIES.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {input.format !== "None" && (
          <div className="space-y-2">
            <Label htmlFor="preview">Preview</Label>
            <ScrollArea className="border rounded p-2 max-h-48 bg-muted text-sm whitespace-pre-wrap">
              <pre id="preview">{preview?.data}</pre>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
