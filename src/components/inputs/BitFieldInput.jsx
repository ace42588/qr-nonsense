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

export function BitFieldInput({ input, onChange }) {
  const [tab, setTab] = useState("fields");

  const { layout, totalBits } = useMemo(
    () => generateBitLayout(input.fields),
    [input.fields]
  );

  const encodedBytes = useMemo(() => {
    try {
      return encodeFieldsToBytes(layout, input.values);
    } catch {
      return null;
    }
  }, [layout, input.values]);

  const emitChange = (updatedFields, updatedValues) => {
    //console.debug("BitFieldInput: emitChange", {updatedFields, updatedValues});
    try {
      const encoded = encodeFieldsToBytes(layout, updatedValues);
      onChange?.({
        data: bytesToHex(encoded),
        mode: "byte",
        encoding: "hex",
        fields: updatedFields,
        values: updatedValues
      });
    } catch {

    }
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
          values={input.values}
          setValues={handleValuesChange}
          layout={layout}
        />
      ) : (
        <BitFieldEditor fields={input.fields} setFields={handleFieldsChange} />
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
