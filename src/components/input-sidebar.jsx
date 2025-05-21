import * as React from "react";
import { GalleryVerticalEnd, Minus, Plus, ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
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
} from "@dnd-kit/sortable";

import { FormatInput } from "./format-input";
import { AddInput } from "./add-input-form";

import { useInputs, useInputDispatch, useDerivedQRData } from "../state";
import { SortableInput } from "./sortable-input";

export function InputSidebar({ ...props }) {
  const { inputs } = useInputs();
  const { reorderInputs } = useInputDispatch();

  const { errorCorrectionLevel, version, dataMask } = useInputs();
  const { version: cVersion, dataMask: cDataMask } = useDerivedQRData();
  const { setErrorCorrection, setVersion, setDataMask } = useInputDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
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
      <SidebarGroup>
        <SidebarGroupLabel>Format</SidebarGroupLabel>
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
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Inputs</SidebarGroupLabel>
        <SidebarGroupAction title="Add Input">
          <Plus /> <span className="sr-only">Add Input</span>
        </SidebarGroupAction>
        <SidebarMenu>
          <Collapsible
            key="inputs"
            asChild
            defaultOpen={true}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip="Inputs">
                  <span>Inputs</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <AddInput />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={reorderInputs}
                >
                  <SortableContext
                    items={inputs.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <SidebarMenuSub>
                      {inputs.map((input, idx) => (
                        <SidebarMenuSubItem key={inputs.label}>
                          <SidebarMenuSubButton asChild>
                            <a href="#">
                              <span>{inputs.label}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SortableContext>
                </DndContext>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>

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
