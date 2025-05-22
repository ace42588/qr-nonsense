import * as React from "react";

import { Button } from "@/components/ui/button";

import {
  GalleryVerticalEnd,
  GripVerticalIcon,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
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
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { FormatInput } from "./format-input";

import { useInputs, useInputDispatch, useDerivedQRData } from "../state";

import {
  addInput,
  removeInput,
  reorderInputs,
  setActiveInput,
  updateInput,
} from "../state/inputs/inputActions";


export function InputSidebar({ ...props }) {
  const { inputs, activeInputID } = useInputs();
  const dispatch = useInputDispatch();
  const [renamingId, setRenamingId] = React.useState(null);
  const nextLabel = React.useRef(inputs?.length || 0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
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

    const [editValue, setEditValue] = React.useState(input.label);

    const handleRenameCommit = () => {
      dispatch(updateInput( input.id, { label: editValue }));
      setRenamingId(null);
    };

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
          isActive={activeInputID === input.id}
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
            {renamingId === input.id ? (
              <input
                autoFocus
                className="ml-2 bg-transparent border-b border-input px-1 text-sm focus:outline-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCommit();
                  if (e.key === "Escape") setRenamingId(null);
                }}
              />
            ) : (
              <span onClick={() => dispatch(setActiveInput(input.id))}>
                {input.label}
              </span>
            )}
          </a>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={() => setRenamingId(input.id)}>
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(removeInput(input.id))}>
              <span>Remove</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = inputs.findIndex((i) => i.id === active.id);
    const newIndex = inputs.findIndex((i) => i.id === over.id);
    dispatch(reorderInputs(oldIndex, newIndex));
  };

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

      <FormatInput />

      <SidebarSeparator />
      <SidebarGroup>
        <SidebarGroupLabel>Inputs</SidebarGroupLabel>
        <SidebarGroupAction
          title="Add Input"
          onClick={() => dispatch(addInput(`Input ${nextLabel.current++}`))}
        >
          <Plus /> <span className="sr-only">Add Input</span>
        </SidebarGroupAction>
        <SidebarGroupContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={inputs.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <SidebarMenu>
                {inputs.map((input, idx) => (
                  <DraggableInput
                    key={input.id}
                    input={input}
                    dispatch={dispatch}
                    renamingId={renamingId}
                    setRenamingId={setRenamingId}
                    isActive={activeInputID === input.id}
                  />
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
