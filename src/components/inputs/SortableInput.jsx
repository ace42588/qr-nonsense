// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useInputDispatch } from "../../state";
import { BasicInput } from "./BasicInput";
import { JsonInput } from "./JsonInput";
import { BitFieldInput } from "./BitFieldInput";
import { MACGenerator } from "./MACGenerator";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

const INPUT_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "json", label: "JSON" },
  { value: "bitfield", label: "BitField" },
  { value: "mac", label: "MAC" },
];

const componentMap = {
  basic: BasicInput,
  byte: BasicInput,
  numeric: BasicInput,
  alphanumeric: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export function SortableInput({ input }) {
  const { id, label, type } = input;
  const { updateInput, removeInput, setType } = useInputDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const InputComponent = componentMap[type];

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
              {INPUT_TYPES.map(({ value, label }) => (
                <TabsTrigger value={value}>{label}</TabsTrigger>
              ))}
              <TabsTrigger value="remove" onClick={() => removeInput(id)}>
                ✖
              </TabsTrigger>
            </TabsList>
            {INPUT_TYPES.map(({ value }) => (
              <TabsContent value={value}>
                <InputComponent id={id} input={input} />
              </TabsContent>
            ))}
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
