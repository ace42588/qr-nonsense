import { useState, useEffect, useCallback } from "react";
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
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";

import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";
import SortableInput from "./SortableInput"; // moved out for clarity

export default function InputForm() {
  const [inputs, setInputs] = useState([
    { id: crypto.randomUUID(), mode: "byte", data: "Hello world!" },
  ]);

  const dispatch = useQRDataDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateQRData = useCallback((inputValues) => {
    const parsed = inputValues.map(({ mode, data, encoding }) =>
      parseInput({ mode, data, encoding })
    );
    dispatch({ type: Actions.ChangeInputs, payload: { inputs: parsed } });
  }, [dispatch]);

  useEffect(() => {
    updateQRData(inputs);
  }, [inputs, updateQRData]);

  const handleAddInput = () =>
    setInputs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), mode: "byte", data: "" },
    ]);

  const handleChange = (id, updated) =>
    setInputs((prev) =>
      prev.map((input) => (input.id === id ? { ...input, ...updated } : input))
    );

  const handleRemove = (id) =>
    setInputs((prev) => prev.filter((input) => input.id !== id));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = inputs.findIndex((i) => i.id === active.id);
    const newIndex = inputs.findIndex((i) => i.id === over.id);
    setInputs(arrayMove(inputs, oldIndex, newIndex));
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
