import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVerticalIcon } from "lucide-react";
import {
  addBitFieldField,
  removeBitFieldField,
  updateBitFieldField,
  reorderBitFieldFields,
  setBitFieldValues,
} from "../../state/inputs/inputActions";

import { COLORS } from "./constants";

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function maxFromBits(bits) {
  return Math.pow(2, bits) - 1;
}

export function BitFieldInputCard({ input, preview, dispatch }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs defaultValue="fields" className="w-full max-w-3xl">
          <TabsList>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="values">Values</TabsTrigger>
          </TabsList>

          {/* FIELD EDITING */}
          <TabsContent value="fields">
            <div className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={input.fields?.map((f) => f.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  {input.fields?.map((field) => {
                    const {
                      attributes,
                      listeners,
                      setNodeRef,
                      transform,
                      transition,
                      isDragging,
                    } = useSortable({ id: field.id });

                    return (
                      <div
                        key={field.id}
                        ref={setNodeRef}
                        data-dragging={isDragging}
                        className="flex items-center gap-2 mb-2 p-2 rounded border border-muted"
                        style={{
                          transform: CSS.Transform.toString(transform),
                          transition,
                        }}
                      >
                        {/* Grip Button */}
                        <Button
                          {...attributes}
                          {...listeners}
                          style={{ cursor: "grab" }}
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:bg-transparent"
                        >
                          <GripVerticalIcon className="size-3" />
                          <span className="sr-only">Drag to reorder</span>
                        </Button>

                        {/* Label */}
                        <Input
                          placeholder="Label"
                          value={field.label}
                          onChange={(e) =>
                            dispatch(
                              updateBitFieldField(input.id, field.id, {
                                label: e.target.value,
                              })
                            )
                          }
                          className="w-24"
                        />

                        {/* Mode select */}
                        <select
                          value={field.mode}
                          onChange={(e) =>
                            dispatch(
                              updateBitFieldField(input.id, field.id, {
                                mode: e.target.value,
                              })
                            )
                          }
                          className="text-sm border rounded p-1 w-[110px]"
                        >
                          <option value="max">Max Value</option>
                          <option value="bits">Bit Width</option>
                        </select>

                        {/* Value input */}
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
                            className="w-20"
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
                            className="w-20"
                          />
                        )}

                        {/* Bit info */}
                        {field.mode === "max" && (
                          <span className="text-xs text-muted-foreground">
                            ({bitsNeeded(field.max)} bits)
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            dispatch(removeBitFieldField(input.id, field.id))
                          }
                        >
                          ✕
                        </Button>
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>

              <Button
                onClick={() => dispatch(addBitFieldField(input.id))}
                variant="secondary"
              >
                <Plus /> <span className="sr-only">Add Field</span>
              </Button>
            </div>
          </TabsContent>

          {/* VALUE INPUTS */}
          <TabsContent value="values">
            <div className="space-y-3 mt-2">
              {preview?.layout?.map((field) => (
                <div key={field.label} className="flex items-center gap-2">
                  <label className="w-28">{field.label}</label>
                  <Input
                    value={preview.values[field.label] ?? ""}
                    onChange={(e) => {
                      dispatch(
                        setBitFieldValues(input.id, {
                          ...preview.values,
                          [field.label]: Number(e.target.value),
                        })
                      );
                    }}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* VISUALIZATION */}
        {preview?.layout && (
          <>
            <div className="mt-4">
              <div className="flex border rounded overflow-hidden text-white text-xs">
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
              <div className="text-muted-foreground text-sm mt-2">
                {preview.totalBits} bits total
              </div>
            </div>

            <Separator />

            <div className="text-sm mt-2">
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
