import { useReducer, useEffect, useState, useRef } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

import { FormatInput } from "./FormatInput";
import { useInputs, useInputDispatch } from "../state";
import { SortableInput } from "./SortableInput";

export function InputForm() {
  const { inputs } = useInputs();
  const { addInput, reorderInputs } = useInputDispatch();
  const nextLabel = useRef(inputs?.length || 0);
  const [label, setLabel] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="formatInfo">
        <AccordionTrigger>Format Info</AccordionTrigger>
        <AccordionContent>
          <FormatInput />
        </AccordionContent>
      </AccordionItem>
      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={reorderInputs}
        >
          <SortableContext
            items={inputs.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {inputs.map((input) => (
              <SortableInput key={input.id} input={input} />
            ))}
          </SortableContext>
        </DndContext>
        <div className="input-button-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Input Label"
            required
          />

          <button
            onClick={() => {
              addInput(label !== "" ? label : `Input ${nextLabel.current++}`);
              setLabel("");
            }}
          >
            Add
          </button>
        </div>
      </div>
    </Accordion>
  );
}
