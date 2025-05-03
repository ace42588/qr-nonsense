import React, { useMemo, useState } from "react";
import BitFieldEditor from "./BitFieldEditor";
import BitFieldValues from "./BitFieldValues";
import BitFieldVisualizer from "./BitFieldVisualizer";
import { bytesToHex, encodeFieldsToBytes, generateBitLayout } from "./utils";

export default function BitFieldSection({
  fields,
  setFields,
  values,
  onChange,
}) {
  const { layout, totalBits } = generateBitLayout(fields);

  const handleValuesChange = (newValues) => {
    try {
      const encoded = encodeFieldsToBytes(layout, newValues);
      onChange?.({
        data: encoded, // raw bytes or hex string if needed
        fields,
        values: newValues,
      });
    } catch (err) {

    }
  };

  const encodedBytes = useMemo(() => {
    try {
      return encodeFieldsToBytes(layout, values);
    } catch (err) {
      return null;
    }
  }, [layout, values]);

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <BitFieldEditor fields={fields} setFields={setFields} />
      <BitFieldValues
        values={values}
        setValues={handleValuesChange}
        layout={layout}
      />
      <BitFieldVisualizer layout={layout} totalBits={totalBits} />
      {encodedBytes ? (
        <div style={{ marginTop: 8 }}>
          <b>Encoded Bytes:</b> {bytesToHex(encodedBytes)}
        </div>
      ) : (
        <div style={{ marginTop: 8, color: "red" }}>
          (missing or invalid values)
        </div>
      )}
    </div>
  );
}
