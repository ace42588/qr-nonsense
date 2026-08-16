// React
import * as React from "react";

// External Libraries
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
import {
  GalleryVerticalEnd,
  GripVerticalIcon,
  MoreHorizontal,
  Plus,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Feature Components
import { FormatInput } from "./FormatInput";
import { ImageTransformInput } from "./ImageTransformInput";

// State and Actions
import { useInputs, useInputDispatch } from "@/state/inputs/InputContext";
import {
  addInput,
  removeInput,
  updateInput,
  setActiveInput,
  reorderInputs,
  setActivePayload,
} from "@/state/inputs/inputActions";

export function InputSidebar({ dualPayloadMode = false, ...props }) {
  const {
    inputs,
    inputsB,
    activeInputID,
    activeInputIDB,
    activePayload,
  } = useInputs();
  const dispatch = useInputDispatch();
  const [renamingId, setRenamingId] = React.useState(null);

  const list = dualPayloadMode && activePayload === "b" ? inputsB : inputs;
  const activeId =
    dualPayloadMode && activePayload === "b" ? activeInputIDB : activeInputID;
  const nextLabel = React.useRef(list?.length || 0);

  React.useEffect(() => {
    nextLabel.current = list?.length || 0;
  }, [list?.length, activePayload]);

  // Keep editor on Payload A when leaving dual modes
  React.useEffect(() => {
    if (!dualPayloadMode && activePayload !== "a") {
      dispatch(setActivePayload("a"));
    }
  }, [dualPayloadMode, activePayload, dispatch]);

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
      dispatch(updateInput(input.id, { label: editValue }));
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
          isActive={activeId === input.id}
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
              <div
                className="flex-1 cursor-pointer px-2 py-1"
                onClick={() => dispatch(setActiveInput(input.id))}
              >
                <span>{input.label}</span>
              </div>
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
    const oldIndex = list.findIndex((i) => i.id === active.id);
    const newIndex = list.findIndex((i) => i.id === over.id);
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

      <ImageTransformInput />

      <SidebarSeparator />
      <SidebarGroup>
        <SidebarGroupLabel>
          {dualPayloadMode
            ? `Inputs (Payload ${activePayload.toUpperCase()})`
            : "Inputs"}
        </SidebarGroupLabel>
        <SidebarGroupAction
          title="Add Input"
          onClick={() => dispatch(addInput(`Input ${nextLabel.current++}`))}
        >
          <Plus /> <span className="sr-only">Add Input</span>
        </SidebarGroupAction>
        {dualPayloadMode && (
          <div className="px-2 pb-2">
            <ToggleGroup
              type="single"
              size="sm"
              value={activePayload}
              onValueChange={(value) =>
                value && dispatch(setActivePayload(value))
              }
              className="w-full justify-start"
            >
              <ToggleGroupItem value="a" aria-label="Payload A" className="flex-1">
                A
              </ToggleGroupItem>
              <ToggleGroupItem value="b" aria-label="Payload B" className="flex-1">
                B
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
        <SidebarGroupContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={list.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <SidebarMenu>
                {list.map((input) => (
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
