import Editor from "@monaco-editor/react";
import {
  useQRDataDispatch,
  useInputDispatch,
  useInputs,
  useParsedInputs,
} from "../state";
import { predefinedSchemas } from "../domain/input";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

import { MACGenerator } from "@/components/MACGenerator";

function QRModeSelect({ input }) {
  const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <Select defaultValue="byte">
      <SelectTrigger>
        <SelectValue placeholder="Select Mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Modes</SelectLabel>
          {modes.map((mode) => (
            <SelectItem className="capitalize" value={mode}>
              {mode}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function BasicInput({ input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <QRModeSelect input={input} />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Text</Label>
            <Input
              id="name"
              type="text"
              value={text}
              onChange={(e) => handleChange("text", e.target.value)}
            />
          </div>
          {mode === "byte" && (
            <div className="flex items-center space-x-2">
              <Switch
                id="force-utf-8"
                onChange={(e) =>
                  handleChange(
                    "encoding",
                    e.target.checked ? "utf-8" : undefined
                  )
                }
              />
              <Label htmlFor="force-utf-8">Force UTF-8</Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function JsonInput({ input }) {
  const { updateInput, updateEncoding, updateSchema, updateSchemaName } =
    useInputDispatch();
  const { obj, schema, format, id } = input;
  const preview = useParsedInputs()[id];

  const options = {
    minimap: { enabled: false },
    scrollbar: { vertical: "hidden", horizontal: "hidden" },
    overviewRulerLanes: 0,
  };

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
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <Tabs defaultValue="json">
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
              <Label>Schema</Label>
              <Select value={input.schemaName} onChange={handleSchemaSelect}>
                {Object.entries(predefinedSchemas).map(([name]) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <Editor
                height="300px"
                defaultLanguage="json"
                value={JSON.stringify(schema, null, 2)}
                onChange={(e) => handleJsonChange("schema", e)}
                options={options}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

function BitFieldInput({ id, input }) {
  const { encodedBytes } = useParsedInputs()[id];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
      <Tabs defaultValue="fields" className="w-half">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <BitFieldEditor id={id} input={input} />
        </TabsContent>

        <TabsContent value="values">
          <BitFieldValues id={id} input={input} />
        </TabsContent>
      </Tabs>
        </div>
      </CardContent>
      <CardFooter></CardFooter>

      <BitFieldVisualizer id={id} input={input} />
      <div style={{ marginTop: 8 }}>
        {encodedBytes ? (
          <>
            <b>Encoded Bytes:</b> {encodedBytes}
          </>
        ) : (
          <span style={{ color: "red" }}>(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}

const INPUT_TYPES = {
  basic: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export function InputCard() {
  const { inputs, activeInputID } = useInputs();
  console.debug({ activeInputID, inputs });
  const activeInput = inputs.find(({ id }) => id == activeInputID);
  const InputComponent = INPUT_TYPES[activeInput.type];
  return (
    <Tabs defaultValue="string" className="w-[400px]">
      <TabsList className="@4xl/main:flex">
        <TabsTrigger value="string">String</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="bitfield">BitField</TabsTrigger>
        <TabsTrigger value="mac">MAC</TabsTrigger>
      </TabsList>
      <TabsContent value="string">
        <BasicInput input={activeInput} />
      </TabsContent>
      <TabsContent value="json">
        <JsonInput input={activeInput} />
      </TabsContent>
    </Tabs>
  );
}
