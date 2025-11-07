// External Libraries
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVerticalIcon, Plus, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Actions
import {
  updateBitFieldField,
  removeBitFieldField,
  reorderBitFieldFields,
  addBitFieldField,
  setBitFieldValues,
} from "@/state/inputs/inputActions";

// Utils
import { maxFromBits, bitsNeeded } from "@/domain/input/parsers/utils/bitFieldUtils";

// Constants
import { COLORS } from "./constants";

// Helper Functions
function SortableField({ field, dispatch, input, preview }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editValue, setEditValue] = useState(field.label);
  const inputRef = useRef(null);

  const {
    attributes,
    listeners,
    transform,
    transition,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: field.id,
  });

  const handleRenameCommit = () => {
    if (editValue.trim()) {
      dispatch(
        updateBitFieldField(input.id, field.id, {
          label: editValue.trim(),
        })
      );
    }
    setIsRenaming(false);
  };

  const handleModeToggle = (checked) => {
    const newMode = checked ? "bits" : "max";
    const updates = {
      mode: newMode,
    };
    
    // When switching to bits mode, set a default bit width
    if (newMode === "bits") {
      updates.bitWidth = bitsNeeded(field.max);
      updates.max = maxFromBits(updates.bitWidth);
    }
    // When switching to max mode, keep the same max value based on current bit width
    else {
      updates.max = maxFromBits(field.bitWidth);
    }
    
    dispatch(updateBitFieldField(input.id, field.id, updates));
  };

  const fieldValue = preview?.values?.[field.label] ?? "";

  return (
    <div
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 flex items-center rounded-md"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Button
        {...attributes}
        {...listeners}
        style={{ cursor: "grab" }}
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:bg-transparent"
      >
        <GripVerticalIcon />
        <span className="sr-only">Drag to reorder</span>
      </Button>

      <div className="flex-1 flex items-center gap-2">
        {isRenaming ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameCommit();
              if (e.key === "Escape") setIsRenaming(false);
            }}
          />
        ) : (
          <span className="text-sm px-2 w-24">{field.label}</span>
        )}

        {field.mode === "max" ? (
          <Input
            type="number"
            value={field.max}
            onChange={(e) =>
              dispatch(
                updateBitFieldField(input.id, field.id, {
                  max: Number(e.target.value),
                })
              )
            }
            className="w-16"
          />
        ) : (
          <Input
            type="number"
            value={field.bitWidth}
            onChange={(e) => {
              const bw = Number(e.target.value);
              dispatch(
                updateBitFieldField(input.id, field.id, {
                  bitWidth: bw,
                  max: maxFromBits(bw),
                })
              );
            }}
            className="w-16"
          />
        )}

        {field.mode === "max" && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            ({bitsNeeded(field.max)} bits)
          </span>
        )}

        <Input
          type="number"
          value={fieldValue}
          onChange={(e) => {
            dispatch(
              setBitFieldValues(input.id, {
                ...preview?.values,
                [field.label]: Number(e.target.value),
              })
            );
          }}
          className="w-24"
          placeholder="Value"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsRenaming(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Switch
              id={`mode-switch-${field.id}`}
              checked={field.mode === "bits"}
              onCheckedChange={handleModeToggle}
            />
            <Label htmlFor={`mode-switch-${field.id}`} className="text-sm">
              Fixed Width
            </Label>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => dispatch(removeBitFieldField(input.id, field.id))}
            className="text-destructive focus:text-destructive"
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function BitFieldInputCard({ input, preview, dispatch }) {
  const nextLabel = useRef(input.fields?.length || 0);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = input.fields?.findIndex((f) => f.id === active.id);
    const newIndex = input.fields?.findIndex((f) => f.id === over.id);
    dispatch(reorderBitFieldFields(input.id, oldIndex, newIndex));
  };

  const handleAddField = () => {
    dispatch(addBitFieldField(input.id, `Field ${nextLabel.current}`));
    nextLabel.current++;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={input.fields?.map((f) => f.id) || []}
              strategy={verticalListSortingStrategy}
            >
              {input.fields?.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  dispatch={dispatch}
                  input={input}
                  preview={preview}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            onClick={handleAddField}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 size-4" /> Add Field
          </Button>
        </div>

        {/* VISUALIZATION */}
        {preview?.layout && (
          <>
            <Separator />
            
            <div>
              <div className="flex border rounded-md overflow-hidden text-white text-xs">
                {preview.layout.map((field, idx) => {
                  const widthPercent = (field.width / preview.totalBits) * 100;
                  return (
                    <div
                      key={field.label}
                      className="text-center whitespace-nowrap overflow-hidden"
                      title={`${field.label} (${field.width} bits)`}
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                        lineHeight: "30px",
                      }}
                    >
                      {field.label}: {field.startBit}→{field.endBit}
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {preview.totalBits} bits total
              </div>
            </div>

            <Separator />

            <div className="text-sm">
              {preview.encodedBytes ? (
                <span>
                  <b>Encoded Bytes:</b> {preview.encodedBytes}
                </span>
              ) : (
                <span className="text-destructive">
                  (missing or invalid values)
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
