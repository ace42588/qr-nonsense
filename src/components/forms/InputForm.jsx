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
import { parseInput } from "./inputUtils";
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
            items={inputs.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {inputs.map((field) => (
              <SortableField
                key={field.id}
                field={field}
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

const INPUT_TYPES = ["basic", "json", "bitField"];

function inferType(initial) {
  if (initial?.type && INPUT_TYPES.includes(initial.type)) return initial.type;
  if (initial?.fields && initial?.values) return "bitField";
  if (typeof initial?.data === "object") return "json";
  if (typeof initial?.data === "string") {
    try {
      JSON.parse(initial.data);
      return "json";
    } catch {
      return "basic";
    }
  }
  return "basic";
}

function SortableInput({ initial = {}, onChange, onRemove }) {
  const inferredType = useMemo(() => inferType(initial), [initial]);

  const [type, setType] = useState(initial.type || "basic");
  const [fields, setFields] = useState(
    initial.fields || [{ id: "0", label: "label", min: 0, max: 255 }]
  );
  const [values, setValues] = useState(initial.values || {});
  const [input, setInput] = useState(initial.data || "");

  const handlePrimitiveChange = (newInput) => {
    setInput(newInput.data);
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <span {...listeners} style={{ cursor: "grab", marginRight: 8 }}>
        ☰
      </span>
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <div className="input-button-row">
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
          <button type="button" onClick={onRemove}>
            ✖
          </button>
        </div>

        {type === "basic" && (
          <BasicInput input={input} onChange={handlePrimitiveChange} />
        )}
        {type === "json" && (
          <JsonInput
            input={{
              data: {
                p: "A",
                cc: 133,
                txn: "99999",
                i: [
                  {
                    v: 5432,
                    q: 1,
                  },
                  {
                    v: 6666,
                    q: 3,
                  },
                  {
                    v: 1234,
                    q: 2,
                  },
                ],
              },
            }}
            onChange={handlePrimitiveChange}
            fieldMap={{
              transactionKey: "txn",
              conferenceKey: "cc",
              platformKey: "p",
              itemsKey: "i",
              variantKey: "v",
              quantityKey: "q",
            }}
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
