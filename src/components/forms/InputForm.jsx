import { useReducer, useEffect } from "react";
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

import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";
import { SortableInput} from "../inputs/SortableInput";

function inputReducer(state, action) {
  switch (action.type) {
    case "add":
      return [...state, { id: crypto.randomUUID(), mode: "byte", data: "" }];
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
  const [inputs, dispatchLocal] = useReducer(inputReducer, [
    { id: crypto.randomUUID(), mode: "byte", data: "Hello world!" },
  ]);

  const dispatchQR = useQRDataDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const parsed = inputs.map(({ mode, data, encoding }) =>
      parseInput({ mode, data, encoding })
    );
    dispatchQR({
      type: Actions.ChangeInputs,
      payload: { inputs: parsed },
    });
  }, [inputs, dispatchQR]);

  const handleChange = (id, payload) =>
    dispatchLocal({ type: "update", id, payload });

  const handleRemove = (id) => dispatchLocal({ type: "remove", id });

  const handleAddInput = () => dispatchLocal({ type: "add" });

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = inputs.findIndex((i) => i.id === active.id);
    const newIndex = inputs.findIndex((i) => i.id === over.id);
    dispatchLocal({ type: "reorder", oldIndex, newIndex });
  };

  return (
    <div className="input-form">
      <QRInfoInput />
      <div style={{ marginBottom: 32 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
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

        <button onClick={handleAddInput} style={{ marginTop: 8 }}>
          + Add Input
        </button>
      </div>
    </div>
  );
}
