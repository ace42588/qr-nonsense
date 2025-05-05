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
  const [fields, setFields] = useState(input.fields || []);
  const [values, setValues] = useState(input.values || {});
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
    try {
      const encoded = encodeFieldsToBytes(layout, updatedValues);
      onChange?.({
        data: bytesToHex(encoded),
        fields: updatedFields,
        values: updatedValues,
      });
    } catch {
      // Ignore encoding failures
    }
  };

  /*
  useEffect(() => {
    emitChange(fields, values);
  }, []);
  */

  const handleFieldsChange = (newFields) => {
    setFields(newFields);
    emitChange(newFields, values);
  };

  const handleValuesChange = (newValues) => {
    setValues(newValues);
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
          setValues={handleValuesChange}
          layout={layout}
        />
      ) : (
        <BitFieldEditor fields={fields} setFields={handleFieldsChange} />
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
