import React, { useMemo } from "react";
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
  const { layout, totalBits } = useMemo(
    () => generateBitLayout(fields),
    [fields]
  );

  const handleUpdate = (updatedFields, updatedValues) => {
    try {
      const encoded = encodeFieldsToBytes(layout, updatedValues);
      onChange?.({
        data: bytesToHex(encoded),
        fields: updatedFields,
        values: updatedValues,
      });
    } catch {
      // Encoding failed — skip update or optionally notify
    }
  };

  const handleFieldsChange = (newFields) => {
    setFields(newFields);
    handleUpdate(newFields, values);
  };

  const handleValuesChange = (newValues) => {
    handleUpdate(fields, newValues);
  };

  const encodedBytes = useMemo(() => {
    try {
      return encodeFieldsToBytes(layout, values);
    } catch {
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
      <BitFieldEditor fields={fields} setFields={handleFieldsChange} />
      <BitFieldValues
        values={values}
        setValues={handleValuesChange}
        layout={layout}
      />
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
