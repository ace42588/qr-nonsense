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
            <SidebarMenuSubItem key="Error Correction Level">
              <SidebarMenuSubButton asChild isActive={true}>
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
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem key="QR Code Version">
              <SidebarMenuSubButton asChild isActive={true}>
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
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem key="Data Mask">
              <SidebarMenuSubButton asChild isActive={true}>
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
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
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
