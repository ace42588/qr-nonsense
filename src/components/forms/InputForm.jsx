import { useState, useContext, useEffect, useCallback } from "react";
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
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "../styles/styles.css";
import { QRInfoInput } from "../qr/QRInfoInput";
import { InputSection } from "./InputSection";

import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";

export function InputForm() {
  const [inputs, setInputs] = useState([
    { id: crypto.randomUUID(), mode: "byte", data: "Hello world!" },
  ]);

  const dispatch = useQRDataDispatch();

  const updateQRData = useCallback(
    (inputValue = inputs) => {
      const parsed = inputs.map(({ mode, data, encoding }) =>
        parseInput({ mode, data, encoding })
      );
      console.debug("updateQRData", { inputValue });
      dispatch({
        type: Actions.ChangeInputs,
        payload: { inputs: parsed },
      });
    },
    [dispatch, inputs]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].data = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, { mode, encoding }) => {
    const newInputs = [...inputs];
    const input = newInputs[index];
    newInputs[index] = { ...input, mode, encoding };
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, { id: crypto.randomUUID(), mode: "byte", data: "" }]);
  };

  const handleChange = (id, newInput) => {
    setInputs((prev) =>
      prev.map((input) => (input.id === id ? { ...input, ...newInput } : input))
    );
  };

  const handleRemoveInput = (id) => {
    setInputs((prev) => prev.filter((input) => input.id !== id));
  };

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      const oldIndex = inputs.findIndex((f) => f.id === active.id);
      const newIndex = inputs.findIndex((f) => f.id === over.id);
      setInputs(arrayMove(inputs, oldIndex, newIndex));
    }
  }

  return (
    <div className="input-form">
      <QRInfoInput />
      <div className="row">
        {inputs.map((input) => (
          <InputSection
            key={input.id}
            initial={input}
            onChange={(e) => handleChange(input.id, e)}
            onRemove={() => handleRemoveInput(input.id)}
          />
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={handleAddInput}>
          Add Input
        </button>
      </div>
    </div>
  );
}

export default InputForm;

/*
<div key={index} className="input-group">
  <InputModeSelector
    mode={input.mode}
    encoding={input.encoding}
    onChange={(e) => handleModeChange(index, e)}
  />

  <div className="input-button-row">
    <input
      type="text"
      value={input.data}
      onChange={(e) => handleInputChange(index, e)}
      placeholder={`Input ${index + 1}`}
    />
    <button type="button" onClick={() => handleRemoveInput(index)}>
      ✖
    </button>
  </div>
</div>
*/
