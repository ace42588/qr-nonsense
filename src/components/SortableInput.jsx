// SortableInput.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useInputDispatch, useInputs } from "@/state/inputs/InputContext";
import { useParsedInputs } from "@/hooks/useParsedInputs";
import { StringInputCard } from "./input-types/StringInputCard";
import { JsonInputCard } from "./input-types/JsonInputCard";
import { BitFieldInputCard } from "./input-types/BitFieldInputCard";
import { MacInputCard } from "./input-types/MacInputCard";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

export function SortableInput({ input }) {
  const { id, label } = input;
  const dispatch = useInputDispatch();
  const inputs = useInputs().inputs;
  const parsedInputs = useParsedInputs();
  const preview = parsedInputs[id];
  
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <AccordionItem value={id}>
        <AccordionTrigger>
          <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
            ☰ {label}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <Tabs defaultValue="basic" className="w-half">
            <TabsList>
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="bitfield">BitField</TabsTrigger>
              <TabsTrigger value="mac">MAC</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic">
              <StringInputCard input={input} dispatch={dispatch} />
            </TabsContent>
            
            <TabsContent value="json">
              <JsonInputCard input={input} preview={preview} dispatch={dispatch} />
            </TabsContent>
            
            <TabsContent value="bitfield">
              <BitFieldInputCard input={input} preview={preview} dispatch={dispatch} />
            </TabsContent>
            
            <TabsContent value="mac">
              <MacInputCard input={input} inputs={inputs} dispatch={dispatch} preview={preview} />
            </TabsContent>
            
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
