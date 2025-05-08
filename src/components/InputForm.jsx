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
import { useInputList, useQRMessage } from "../state";
import { SortableInput } from "./inputs/SortableInput";

function inputReducer(state, action) {
  switch (action.type) {
    case "add":
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          label: action.label,
          mode: "byte",
          data: "",
        },
      ];
    case "remove":
      return state.filter((input) => input.id !== action.id);
    case "update":
      return state.map((input) =>
        input.id === action.id ? { ...input, ...action.payload } : input
      );
    case "reorder": {
      const { oldIndex, newIndex } = action;
      return arrayMove(state, oldIndex, newIndex);
    }
    default:
      return state;
  }
}

const initialInput = {
  id: crypto.randomUUID(),
  label: "Input 0",
  mode: "byte",
  data: "Hello world",
};

export function InputForm() {
  //const [inputs, dispatch] = useReducer(inputReducer, [initialInput]);
  const { inputs, addInput, updateInput, removeInput, reorderInputs } =
    useInputList();
  const nextLabel = useRef(inputs.length);
  const [label, setLabel] = useState("");
  const { setInputs } = useQRMessage();

  useEffect(() => {
    setInputs(inputs);
  }, [inputs]);

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
              <SortableInput
                key={input.id}
                input={input}
                onChange={updateInput}
                onRemove={removeInput}
              />
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
              addInput(label !== "" ? label : `Input ${nextLabel.current++}` );
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
