import React, { useMemo, useState } from "react";
import BitFieldEditor from "./BitFieldEditor";
import BitFieldValues from "./BitFieldValues";
import BitFieldVisualizer from "./BitFieldVisualizer";
import { bytesToHex, encodeFieldsToBytes, generateBitLayout } from "./utils";

export default function BitFieldSection({
  fields,
  setFields,
  values,
  setValues,
}) {

  const { layout, totalBits } = generateBitLayout(fields);

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
      <BitFieldVisualizer layout={layout} totalBits={totalBits} />

      <BitFieldEditor fields={fields} setFields={setFields} />

      <BitFieldValues values={values} setValues={setValues} layout={layout} />

      {encodedBytes ? (
        <div style={{ marginTop: 8 }}>
          <b>Encoded Bytes:</b> {bytesToHex(encodedBytes)}
        </div>
      ) : (
        <div style={{ marginTop: 8, color: "red" }}>
          Cannot encode (missing or invalid values).
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <b>Total bits:</b> {totalBits}
      </div>
    </div>
  );
}
