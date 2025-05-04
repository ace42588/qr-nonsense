import { useState, useContext, useEffect, useCallback, useMemo } from "react";
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
import { parseInput, inferType, INPUT_TYPES } from "./inputUtils";
import { Actions } from "../../state/qr/Constants";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

export function InputForm() {
  const [inputs, setInputs] = useState([
    { id: crypto.randomUUID(), mode: "byte", data: "Hello world!" },
  ]);

  const dispatch = useQRDataDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateQRData = useCallback(
    (inputValues = inputs) => {
      const parsed = inputValues.map(({ mode, data, encoding }) =>
        parseInput({ mode, data, encoding })
      );
      console.debug("updateQRData", { inputValues });
      dispatch({
        type: Actions.ChangeInputs,
        payload: { inputs: parsed },
      });
    },
    [dispatch, inputs]
  );

  useEffect(() => {
    updateQRData(inputs);
  }, [inputs, updateQRData]);

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

  const handleRemove = (id) => {
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

export default InputForm;

function SortableInput({ input, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: input.id });
  const inferredType = useMemo(() => inferType(input), [input]);

  const [type, setType] = useState(input.type || "basic");
  const [fields, setFields] = useState(
    input.fields || [{ id: "0", label: "label", min: 0, max: 255 }]
  );
  const [values, setValues] = useState(input.values || {});

  const handlePrimitiveChange = (newInput) => {
    onChange?.({ type, ...newInput });
  };

  const handleBitFieldChange = ({
    fields: newFields,
    values: newValues,
    data,
  }) => {
    setFields(newFields);
    setValues(newValues);
    onChange?.({
      type: "bitField",
      mode: "byte",
      encoding: "hex",
      data,
      fields: newFields,
      values: newValues,
    });
  };

  return (
    <div ref={setNodeRef} {...attributes}>
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <div className="input-button-row">
          <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
            ☰
          </span>
          <label htmlFor="inputType">Input Type:</label>
          <select
            id="inputType"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {INPUT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onRemove(input.id)}>
            ✖
          </button>
        </div>

        {type === "basic" && (
          <BasicInput input={input.data} onChange={handlePrimitiveChange} />
        )}
        {type === "json" && (
          <JsonInput
            input={input.data}
            onChange={handlePrimitiveChange}
          />
        )}
        {type === "bitField" && (
          <BitFieldSection
            fields={fields}
            setFields={setFields}
            values={values}
            onChange={handleBitFieldChange}
          />
        )}
      </div>
    </div>
  );
}
