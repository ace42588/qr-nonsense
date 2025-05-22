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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useState, useMemo } from "react";

import {
  addBitFieldField,
  removeBitFieldField,
  updateBitFieldField,
  reorderBitFieldFields,
  setBitFieldValues,
  updateJsonObject,
  updateSchema,
  updateEncoding,
  updateInput,
  setSchemaName,
  setMacKey,
  setMacAlgorithm,
  setIncludedFields,
} from "../state/inputs/inputActions";

import { MAC_FUNCTIONS } from "../domain";
import { ENCODING_STRATEGIES } from "../domain/encoders";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { getTypeDefaults } from "../state/inputs/inputFactory";

const encoder = new TextEncoder("utf-8");
const DEFAULT_FIELD = getTypeDefaults("bitfield").layout[0];
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

const editorOptions = {
  minimap: { enabled: false },
  scrollbar: { vertical: "hidden", horizontal: "hidden" },
  overviewRulerLanes: 0,
  lineNumbers: "off",
};

function JsonInput({ input }) {
  const preview = useParsedInputs()[input.id];
  const [tab, setTab] = useState("values");

  const dispatch = useInputDispatch();
  const handleJsonChange = (field, text) => {
    try {
      const parsed = JSON.parse(text);
      if (field === "obj") dispatch(updateJsonObject(input.id, parsed));
      if (field === "schema") dispatch(updateSchema(input.id, parsed));
    } catch {
      // Optionally show error
    }
  };

  const handleSchemaSelect = (name) => {
    dispatch(updateSchema(input.id, predefinedSchemas[name]));
    dispatch(setSchemaName(input.id, name));
  };

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={tab}
        onValueChange={setTab}
        className="w-full max-w-3xl"
      >
        <TabsList>
          <TabsTrigger value="json">Values</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.obj, null, 2)}
            onChange={(e) => handleJsonChange("obj", e)}
            options={editorOptions}
          />
        </TabsContent>

        <TabsContent value="schema" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="schema-select">Predefined Schema</Label>
            <Select value={input.schemaName} onValueChange={handleSchemaSelect}>
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
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.schema, null, 2)}
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
          onValueChange={(val) => dispatch(updateEncoding(input.id, val))}
        >
          <SelectTrigger id="encoding-select" className="w-64">
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

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}
function maxFromBits(bits) {
  return Math.pow(2, bits) - 1;
}

function SortableField({ inputId, field, dispatch }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const bitCount =
    field.mode === "max" ? bitsNeeded(field.max) : field.bitWidth || 1;

  const update = (key, value) => {
    dispatch(
      updateBitFieldField(inputId, field.id, key ? { [key]: value } : value)
    );
  };

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 mb-2 p-2 rounded border border-muted"
      style={style}
      {...attributes}
    >
      <span {...listeners} className="cursor-grab text-muted-foreground">
        ☰
      </span>

      <Input
        placeholder="Label"
        value={field.label}
        onChange={(e) => update("label", e.target.value)}
        className="w-24"
      />

      <Select value={field.mode} onValueChange={(val) => update("mode", val)}>
        <SelectTrigger className="w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="max">Max Value</SelectItem>
          <SelectItem value="bits">Bit Width</SelectItem>
        </SelectContent>
      </Select>

      {field.mode === "max" ? (
        <Input
          type="number"
          value={field.max}
          onChange={(e) => update("max", Number(e.target.value))}
          className="w-20"
        />
      ) : (
        <Input
          type="number"
          value={field.bitWidth}
          onChange={(e) => {
            const bw = Number(e.target.value);
            update(null, {
              bitWidth: bw,
              max: maxFromBits(bw),
            });
          }}
          className="w-20"
        />
      )}

      {field.mode === "max" && (
        <span className="text-xs text-muted-foreground">({bitCount} bits)</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => dispatch(removeBitFieldField(inputId, field.id))}
      >
        ✕
      </Button>
    </div>
  );
}

function BitFieldEditor({ input }) {
  const dispatch = useInputDispatch();
  const { fields = [] } = input;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddField = () => {
    dispatch(
      addBitFieldField(input.id, {
        ...structuredClone(DEFAULT_FIELD),
        id: crypto.randomUUID(),
      })
    );
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    dispatch(reorderBitFieldFields(input.id, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((field) => (
            <SortableField
              key={field.id}
              inputId={input.id}
              field={field}
              dispatch={dispatch}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button onClick={handleAddField} variant="secondary">
        + Add Field
      </Button>
    </div>
  );
}

function BitFieldValues({ input }) {
  const dispatch = useInputDispatch();
  const { values = {}, layout = [] } = useParsedInputs()[input.id];
  const [type, setType] = useState("base10");

  const handleInputChange = (e, field) => {
    let newValue = e.target.value;
    switch (type) {
      case "base10":
        newValue = Number(newValue);
        break;
      case "base16":
        newValue = parseInt(newValue, 16);
        break;
      case "string":
        newValue = encoder.encode(newValue);
        break;
      default:
        newValue = undefined;
    }
    dispatch(
      setBitFieldValues(input.id, { ...values, [field.label]: newValue })
    );
  };

  return (
    <div className="space-y-3 mt-2">
      {layout.map((field) => (
        <div key={field.label} className="flex items-center gap-2">
          <label className="w-28">{field.label}</label>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["base10", "base16", "string"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={values[field.label] ?? ""}
            onChange={(e) => handleInputChange(e, field)}
            className="w-24"
          />
        </div>
      ))}
    </div>
  );
}

function BitFieldVisualizer({ id }) {
  const { totalBits, layout = [] } = useParsedInputs()[id];

  return (
    <div className="mt-4">
      <div
        className="flex border rounded overflow-hidden text-white text-xs"
        style={{ height: 30, maxWidth: 600 }}
      >
        {layout.map((field, idx) => {
          const widthPercent = (field.width / totalBits) * 100;
          return (
            <div
              key={field.label}
              className="text-center whitespace-nowrap overflow-hidden"
              title={`${field.label} (${field.width} bits)`}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: COLORS[idx % COLORS.length],
                lineHeight: "30px",
              }}
            >
              {field.label}: {field.startBit}→{field.endBit}
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground text-sm mt-2">
        {totalBits} bits total
      </div>
    </div>
  );
}

function BitFieldInput({ input }) {
  const { encodedBytes } = useParsedInputs()[input.id];

  return (
    <div className="space-y-4">
      <Tabs defaultValue="fields" className="w-full max-w-3xl">
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
          <BitFieldEditor input={input} />
        </TabsContent>
        <TabsContent value="values">
          <BitFieldValues input={input} />
        </TabsContent>
      </Tabs>

      <BitFieldVisualizer id={input.id} />

      <div className="text-sm mt-2">
        {encodedBytes ? (
          <span>
            <b>Encoded Bytes:</b> {encodedBytes}
          </span>
        ) : (
          <span className="text-destructive">(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}

function MACGenerator({ input }) {
  const { inputs: allInputs } = useInputs();
  const dispatch = useInputDispatch();
  const previews = useParsedInputs();

  const selectedIds = input.includedFields || [];
  const selectableInputs = allInputs.filter((i) => i.id !== input.id);
  const preview = previews?.[input.id];

  const toggleSelection = (toggleId) => {
    const next = selectedIds.includes(toggleId)
      ? selectedIds.filter((x) => x !== toggleId)
      : [...selectedIds, toggleId];
    dispatch(setIncludedFields(input.id, next));
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">QR MAC Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="mac-key">Secret Key</Label>
          <Input
            id="mac-key"
            value={input.key}
            onChange={(e) => dispatch(setMacKey(input.id, e.target.value))}
            placeholder="Enter shared secret"
          />
        </div>

        <div className="space-y-2">
          <Label>Select Fields</Label>
          <div className="space-y-1 border rounded p-2">
            {selectableInputs.length > 0 ? (
              selectableInputs.map((i) => (
                <div key={i.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`chk-${i.id}`}
                    checked={selectedIds.includes(i.id)}
                    onCheckedChange={() => toggleSelection(i.id)}
                  />
                  <Label htmlFor={`chk-${i.id}`} className="cursor-pointer">
                    {i.label || i.id}
                  </Label>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No fields available
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mac-algo">MAC Algorithm</Label>
          <Select
            value={input.algo}
            onValueChange={(value) =>
              dispatch(setMacAlgorithm(input.id, value))
            }
          >
            <SelectTrigger id="mac-algo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(MAC_FUNCTIONS).map((alg) => (
                <SelectItem key={alg} value={alg}>
                  {alg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="text-sm bg-muted p-3 rounded">
          <strong>MAC:</strong>{" "}
          <code className="text-muted-foreground">
            {preview?.data || "(calculating…)"}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

export function InputCard() {
  const { inputs, activeInputID } = useInputs();
  const dispatch = useInputDispatch();

  const activeInput = inputs.find(({ id }) => id == activeInputID);
  const preview = useParsedInputs()[activeInput.id];

  const handleChange = (field, value) =>
    dispatch(updateInput(activeInput.id, { [field]: value }));
  
  const handleJsonChange = (field, text) => {
    try {
      const parsed = JSON.parse(text);
      if (field === "obj") dispatch(updateJsonObject(activeInput.id, parsed));
      if (field === "schema") dispatch(updateSchema(activeInput.id, parsed));
    } catch {
      // Optionally show error
    }
  };
  
  const handleSchemaSelect = (name) => {
    dispatch(updateSchema(activeInput.id, predefinedSchemas[name]));
    dispatch(setSchemaName(activeInput.id, name));
  };

  return (
    <Tabs defaultValue="string" className="w-[400px]">
      <TabsList className="@4xl/main:flex">
        <TabsTrigger value="string">String</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="bitfield">BitField</TabsTrigger>
        <TabsTrigger value="mac">MAC</TabsTrigger>
      </TabsList>
      <TabsContent value="string">
        <Card>
          <CardHeader>
            <CardTitle>{activeInput.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
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
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Text</Label>
                <Input
                  id="name"
                  type="text"
                  value={activeInput.text}
                  onChange={(e) => handleChange("text", e.target.value)}
                />
              </div>
              {activeInput.mode === "byte" && (
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
      </TabsContent>
      <TabsContent value="json">
        <Card>
          <CardHeader>
            <CardTitle>{activeInput.label}</CardTitle>
          </CardHeader>
          <CardContent>
      <Tabs
        defaultValue={tab}
        onValueChange={setTab}
        className="w-full max-w-3xl"
      >
        <TabsList>
          <TabsTrigger value="json">Values</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.obj, null, 2)}
            onChange={(e) => handleJsonChange("obj", e)}
            options={editorOptions}
          />
        </TabsContent>

        <TabsContent value="schema" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="schema-select">Predefined Schema</Label>
            <Select value={input.schemaName} onValueChange={handleSchemaSelect}>
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
          <Editor
            height="300px"
            defaultLanguage="json"
            value={JSON.stringify(input.schema, null, 2)}
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
          onValueChange={(val) => dispatch(updateEncoding(input.id, val))}
        >
          <SelectTrigger id="encoding-select" className="w-64">
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
        <div className="space-y-2">
          <Label htmlFor="preview">Preview</Label>
          <ScrollArea className="border rounded p-2 max-h-48 bg-muted text-sm whitespace-pre-wrap">
            <pre id="preview">{preview?.data}</pre>
          </ScrollArea>
        </div>
      )}
          </CardContent>
        </Card>
    </div>
      </TabsContent>
      <TabsContent value="bitfield">
        <BitFieldInput input={activeInput} />
      </TabsContent>
      <TabsContent value="mac">
        <MACGenerator input={activeInput} />
      </TabsContent>
    </Tabs>
  );
}
