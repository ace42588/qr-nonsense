import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setInputType } from "@/state/inputs/inputActions";
import { useInputs, useInputDispatch } from "@/state/inputs/InputContext";
import { useActiveParsedInputs } from "@/hooks/useParsedInputs";

import { StringInputCard } from "./input-types/StringInputCard";
import { JsonInputCard } from "./input-types/JsonInputCard";
import { BitFieldInputCard } from "./input-types/BitFieldInputCard";
import { MacInputCard } from "./input-types/MacInputCard";
import { TemplateInputCard } from "./input-types/TemplateInputCard";
import { StructuredAppendInputCard } from "./input-types/StructuredAppendInputCard";
import { Fnc1InputCard } from "./input-types/Fnc1InputCard";

export function InputCard() {
  const { inputs, inputsB, activeInputID, activeInputIDB, activePayload } =
    useInputs();
  const dispatch = useInputDispatch();
  const { parsed, errors } = useActiveParsedInputs();

  const list = activePayload === "b" ? inputsB : inputs;
  const activeId = activePayload === "b" ? activeInputIDB : activeInputID;
  const preview = parsed[activeId];
  const parseError = errors[activeId];

  const input = list.find((i) => i.id === activeId);
  if (!input) return null;

  return (
    <Tabs
      value={input.type}
      onValueChange={(type) => dispatch(setInputType(activeId, type))}
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="string">String</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="bitfield">BitField</TabsTrigger>
        <TabsTrigger value="mac">MAC</TabsTrigger>
        <TabsTrigger value="template">Template</TabsTrigger>
        <TabsTrigger value="structuredAppend">Append</TabsTrigger>
        <TabsTrigger value="fnc1">FNC1</TabsTrigger>
      </TabsList>

      <TabsContent value="string">
        <StringInputCard input={input} dispatch={dispatch} parseError={parseError} />
      </TabsContent>

      <TabsContent value="json" className="w-full max-w-3xl">
        <JsonInputCard input={input} dispatch={dispatch} preview={preview} parseError={parseError} />
      </TabsContent>

      <TabsContent value="bitfield">
        <BitFieldInputCard input={input} dispatch={dispatch} preview={preview} parseError={parseError} />
      </TabsContent>

      <TabsContent value="mac">
        <MacInputCard input={input} dispatch={dispatch} preview={preview} inputs={list} />
      </TabsContent>

      <TabsContent value="template">
        <TemplateInputCard
          input={input}
          dispatch={dispatch}
          preview={preview}
          parseError={parseError}
        />
      </TabsContent>

      <TabsContent value="structuredAppend">
        <StructuredAppendInputCard
          input={input}
          dispatch={dispatch}
          parseError={parseError}
        />
      </TabsContent>

      <TabsContent value="fnc1">
        <Fnc1InputCard
          input={input}
          dispatch={dispatch}
          parseError={parseError}
        />
      </TabsContent>
    </Tabs>
  );
}
