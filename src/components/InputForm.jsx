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

import "./styles/styles.css";
import { QRInfoInput } from "./qr/QRInfoInput";
import { useInputs, useInputDispatch } from "../state";
import { SortableInput } from "./inputs/SortableInput";

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
    <div className="input-form">
      <QRInfoInput />
      <div style={{ marginBottom: 32 }}>
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
            style={{ marginTop: 8 }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
