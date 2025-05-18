// SortableInput.jsx
import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Minus, Plus } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { useInputDispatch } from "../state";
import { BasicInput } from "./inputs/BasicInput";
import { JsonInput } from "./inputs/JsonInput";
import { BitFieldInput } from "./inputs/BitFieldInput";
import { MACGenerator } from "./inputs/MACGenerator";

const INPUT_TYPES = {
  basic: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

// Create a separate component for the drag handle
function DragHandle({ id }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}


export function SortableInput({ input, index }) {
  const { id, label, type } = input;
  const { updateInput, removeInput, setType } = useInputDispatch();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const InputComponent = INPUT_TYPES[type];

  return (
    <Collapsible
      key={id}
      defaultOpen={index === 0}
      className="group/collapsible"
      ref={setNodeRef}
      {...attributes}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
              ☰ {label}
            </span>
            <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
            <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <InputComponent id={id} input={input} />
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
