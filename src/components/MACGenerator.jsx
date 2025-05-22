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
} from "@/components/ui";

export function MACGenerator({ id, input }) {
  const { inputs: allInputs } = useInputs();
  const dispatch = useInputDispatch();
  const previews = useParsedInputs();

  const selectedIds = input.includedFields || [];
  const selectableInputs = allInputs.filter((i) => i.id !== id);
  const preview = previews?.[id];

  const toggleSelection = (toggleId) => {
    const next = selectedIds.includes(toggleId)
      ? selectedIds.filter((x) => x !== toggleId)
      : [...selectedIds, toggleId];
    dispatch(setIncludedFields(id, next));
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
            onChange={(e) => dispatch(setMacKey(id, e.target.value))}
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
              <p className="text-muted-foreground text-sm">No fields available</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="mac-algo">MAC Algorithm</Label>
          <Select
            value={input.algo}
            onValueChange={(value) => dispatch(setMacAlgorithm(id, value))}
          >
            <SelectTrigger id="mac-algo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(MAC_FUNCTIONS).map((alg) => (
                <SelectItem key={alg} value={alg}>{alg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="text-sm bg-muted p-3 rounded">
          <strong>MAC:</strong> <code className="text-muted-foreground">{preview?.data || "(calculating…)"}</code>
        </div>
      </CardContent>
    </Card>
  );
}