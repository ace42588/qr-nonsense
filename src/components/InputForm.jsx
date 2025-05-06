import { useReducer, useEffect, useState } from "react";
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
import { useQRMessage } from "../state";
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

export function InputForm() {
  const [inputs, dispatch] = useReducer(inputReducer, []);
  const [label, setLabel] = useState("");
  const { setInputs } = useQRMessage();

  useEffect(() => {
    setInputs(inputs);
  }, [inputs]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChange = (id, payload) =>
    dispatch({ type: "update", id, payload });

  const handleRemove = (id) => dispatch({ type: "remove", id });

  const handleAddInput = () => {
    dispatch({ type: "add", label });
    setLabel("");
  };

  return (
    <div className="input-form">
      <QRInfoInput />
      <div style={{ marginBottom: 32 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const oldIndex = inputs.findIndex((i) => i.id === active.id);
            const newIndex = inputs.findIndex((i) => i.id === over.id);
            dispatch({ type: "reorder", oldIndex, newIndex });
          }}
        >
          <SortableContext
            items={inputs.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {inputs.map((input) => (
              <SortableInput
                key={input.id}
                input={input}
                onChange={handleChange}
                onRemove={handleRemove}
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

          <button onClick={handleAddInput} style={{ marginTop: 8 }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
