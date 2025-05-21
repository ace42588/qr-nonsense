import * as React from "react";

import { Button } from "@/components/ui/button";

import {
  GalleryVerticalEnd,
  GripVerticalIcon,
  Minus,
  MoreHorizontal,
  Plus,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

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
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { FormatInput } from "./format-input";
import { AddInput } from "./add-input-form";

import { useInputs, useInputDispatch, useDerivedQRData } from "../state";
import { SortableInput } from "./sortable-input";

export function InputSidebar({ ...props }) {
  const { inputs } = useInputs();
  const { errorCorrectionLevel, version, dataMask } = useInputs();

  const { addInput, reorderInputs, removeInput } = useInputDispatch();
  const { setErrorCorrection, setVersion, setDataMask } = useInputDispatch();

  const { version: cVersion, dataMask: cDataMask } = useDerivedQRData();

  const nextLabel = React.useRef(inputs?.length || 0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeInput, setActiveInput] = React.useState(inputs[0]);
  const { setOpen } = useSidebar();

  function DraggableInput({ input }) {
    const {
      attributes,
      listeners,
      transform,
      transition,
      setNodeRef,
      isDragging,
    } = useSortable({
      id: input.id,
    });

    return (
      <SidebarMenuItem key={input.id}>
        <SidebarMenuButton
          data-dragging={isDragging}
          ref={setNodeRef}
          className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
          style={{
            transform: CSS.Transform.toString(transform),
            transition: transition,
          }}
          asChild
        >
          <a href="#">
            <Button
              {...attributes}
              {...listeners}
              style={{ cursor: "grab" }}
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-transparent"
            >
              <GripVerticalIcon className="size-3 text-muted-foreground" />
              <span className="sr-only">Drag to reorder</span>
            </Button>
            <span onClick={}>{input.label}</span>
          </a>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => removeInput(input.id)}>
              <span>Remove</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem key="header">
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">QR Non-sense</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <Collapsible
        key="formatInfo"
        defaultOpen={false}
        className="group/collapsible"
      >
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              Format
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarMenu>
              <SidebarMenuItem key="Error Correction Level">
                <SidebarMenuButton asChild isActive={true}>
                  <select
                    id="ec-level"
                    value={errorCorrectionLevel}
                    onChange={(e) => setErrorCorrection(e.target.value)}
                  >
                    {levels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem key="QR Code Version">
                <SidebarMenuButton asChild isActive={true}>
                  <select
                    id="qr-version"
                    value={cVersion || version}
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    {versions.map((ver) => (
                      <option key={ver.value} value={ver.value}>
                        {ver.label}
                      </option>
                    ))}
                  </select>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem key="Data Mask">
                <SidebarMenuButton asChild isActive={true}>
                  <select
                    id="data-mask"
                    value={cDataMask || dataMask}
                    onChange={(e) => setDataMask(e.target.value)}
                  >
                    {masks.map((mask) => (
                      <option key={mask.value} value={mask.value}>
                        {mask.label}
                      </option>
                    ))}
                  </select>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
      <SidebarSeparator />
      <SidebarGroup>
        <SidebarGroupLabel>Inputs</SidebarGroupLabel>
        <SidebarGroupAction
          title="Add Input"
          onClick={() => addInput(`Input ${nextLabel.current++}`)}
        >
          <Plus /> <span className="sr-only">Add Input</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reorderInputs}
          >
            <SortableContext
              items={inputs.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <SidebarMenu>
                {inputs.map((input, idx) => (
                  <DraggableInput key={input.id} input={input} />
                ))}
              </SidebarMenu>
            </SortableContext>
          </DndContext>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarSeparator />
      <SidebarRail />
    </Sidebar>
  );
}

const levels = [
  { label: "Low (L) – 7% redundancy", value: 0 },
  { label: "Medium (M) – 15% redundancy", value: 1 },
  { label: "Quartile (Q) – 25% redundancy", value: 2 },
  { label: "High (H) – 30% redundancy", value: 3 },
];

const versions = [{ label: "Auto", value: -1 }].concat(
  Array.from({ length: 40 }, (_, i) => ({
    label: `Version ${i + 1}`,
    value: i + 1,
  }))
);

const masks = [
  { label: "Auto", value: -1 },
  { label: "Mask 0", value: 0 },
  { label: "Mask 1", value: 1 },
  { label: "Mask 2", value: 2 },
  { label: "Mask 3", value: 3 },
  { label: "Mask 4", value: 4 },
  { label: "Mask 5", value: 5 },
  { label: "Mask 6", value: 6 },
  { label: "Mask 7", value: 7 },
  { label: "None", value: null },
];
