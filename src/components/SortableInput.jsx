// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useInputDispatch } from "../state";
import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";
import { MACGenerator } from "./MACGenerator";

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
  const { id, label, type } = input;
  const { updateInput, removeInput, setType } = useInputDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div ref={setNodeRef} {...attributes}>
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
              <TabsTrigger value="remove" onClick={() => removeInput(id)}>
                ✖
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic">
              <BasicInput id={id} input={input} />
            </TabsContent>
            
            <TabsContent value="json">
              <JsonInput id={id} input={input} />
            </TabsContent>
            
            <TabsContent value="bitfield">
              <BitFieldInput id={id} input={input} />
            </TabsContent>
            
            <TabsContent value="mac">
              <MACGenerator id={id} input={input} />
            </TabsContent>
            
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
