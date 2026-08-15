import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setInputType } from "@/state/inputs/inputActions";
import { useInputs, useInputDispatch } from "@/state/inputs/InputContext";
import { useParsedInputs } from "@/hooks/useParsedInputs";

import { StringInputCard } from "./input-types/StringInputCard";
import { JsonInputCard } from "./input-types/JsonInputCard";
import { BitFieldInputCard } from "./input-types/BitFieldInputCard";
import { MacInputCard } from "./input-types/MacInputCard";

export function InputCard() {
  const { inputs, activeInputID } = useInputs();
  const dispatch = useInputDispatch();
  const { parsed, errors } = useParsedInputs();
  const preview = parsed[activeInputID];
  const parseError = errors[activeInputID];

  const input = inputs.find((i) => i.id === activeInputID);
  if (!input) return null;

  return (
    <Tabs
      value={input.type}
      onValueChange={(type) => dispatch(setInputType(activeInputID, type))}
    >
      <TabsList className="@4xl/main:flex">
        <TabsTrigger value="string">String</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="bitfield">BitField</TabsTrigger>
        <TabsTrigger value="mac">MAC</TabsTrigger>
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
        <MacInputCard input={input} dispatch={dispatch} preview={preview} inputs={inputs} />
      </TabsContent>
    </Tabs>
  );
}
