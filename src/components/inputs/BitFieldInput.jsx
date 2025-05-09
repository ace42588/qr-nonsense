import React, { useMemo, useState, useEffect } from "react";
import {
  BitFieldEditor,
  BitFieldValues,
  BitFieldVisualizer,
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayout,
} from "./BitField";
import { TabSwitcher } from "../shared/TabSwitcher";
import { useEncodedInputs, useInputs, useInputDispatch } from "../../state";

export function BitFieldInput({ id }) {
  const inputs = useInputs();
  const { updateInput } = useInputDispatch();
  const previews = useEncodedInputs();

  const input = inputs.find((i) => i.id === id);
  input.type = "bitField";
  const {fields = [], values = {}} = input;
  const preview = previews[id];
  //console.debug("BitFieldInput", { preview });

  const [tab, setTab] = useState("fields");

  const { layout, totalBits } = useMemo(
    () => generateBitLayout(fields),
    [fields]
  );

  const encodedBytes = useMemo(() => {
    try {
      return encodeFieldsToBytes(layout, values);
    } catch {
      return null;
    }
  }, [layout, values]);

  const emitChange = (updatedFields, updatedValues) => {
    const newInput = {
      ...input,
      mode: "byte",
      encoding: "hex",
      fields: updatedFields,
      values: updatedValues,
    };
    console.debug("BitFieldInput: emitChange", { newInput });
    try {
      const encodedBytes = encodeFieldsToBytes(layout, updatedValues);
      newInput.data = bytesToHex(encodedBytes);
    } catch {}
    updateInput?.(newInput);
  };

  const handleFieldsChange = (newFields) => {
    emitChange(newFields, values);
  };

  const handleValuesChange = (newValues) => {
    emitChange(fields, newValues);
  };

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <TabSwitcher
        options={[
          { value: "fields", label: "Fields" },
          { value: "values", label: "Values" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "values" ? (
        <BitFieldValues
          values={values}
          onChange={handleValuesChange}
          layout={layout}
        />
      ) : (
        <BitFieldEditor fields={fields} onChange={handleFieldsChange} />
      )}

      <BitFieldVisualizer layout={layout} totalBits={totalBits} />
      <div style={{ marginTop: 8 }}>
        {encodedBytes ? (
          <>
            <b>Encoded Bytes:</b> {bytesToHex(encodedBytes)}
          </>
        ) : (
          <span style={{ color: "red" }}>(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}
