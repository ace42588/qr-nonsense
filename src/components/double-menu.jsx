import { useState } from "react";
import {
  ArchiveX,
  Command,
  File,
  GripVerticalIcon,
  Inbox,
  Send,
  Trash2,
} from "lucide-react";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

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

import { FormatInput } from "./format-input";
import { AddInput } from "./add-input-form";

import { useInputs, useInputDispatch, useDerivedQRData } from "../state";
import { SortableInput } from "./sortable-input";

// Create a separate component for the drag handle
function DragHandle({ id }) {
  const { attributes, listeners } = useSortable({
    id,
  });

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
  );
}

export function InputSidebar({ ...props }) {
  const { inputs } = useInputs();
  const { reorderInputs } = useInputDispatch();
  const { setOpen } = useSidebar();

  const [activeInput, setActiveInput] = useState(inputs[0]);

  function DraggableRow({ input }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
      id: input.id,
    });

    return (
      <SidebarMenuItem
        data-dragging={isDragging}
        ref={setNodeRef}
        className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition,
        }}
      >
        <DragHandle id={input.id} />
        <SidebarMenuButton
          tooltip={input.label}
          onClick={() => {
            setActiveInput(input);
            setOpen(true);
          }}
          isActive={activeInput?.label === input.label}
          className="px-2.5 md:px-2"
        >
          <GripVerticalIcon className="size-3 text-muted-foreground" />
          <span>{input.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar collapsible="none">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {inputs.map((input) => (
                  <DraggableRow input={input} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {() => {
                const InputComponent = INPUT_TYPES[activeInput.type];
                return (
                  <InputComponent id={activeInput.id} input={activeInput} />
                );
              }}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
