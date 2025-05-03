import React, { useMemo, useState } from "react";
import BitFieldEditor from "./BitFieldEditor";
import BitFieldValues from "./BitFieldValues";
import BitFieldVisualizer from "./BitFieldVisualizer";
import { bytesToHex, encodeFieldsToBytes, generateBitLayout } from "./utils";

export default function BitFieldSection({
  title,
  fields,
  setFields,
  values,
  setValues,
}) {
  const [expanded, setExpanded] = useState(true);

  const { layout, totalBits } = generateBitLayout(fields);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

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
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          margin: 0,
        }}
        onClick={toggleExpanded}
      >
        <span style={{ marginRight: 8 }}>{expanded ? "▾" : "▸"}</span>
        {title}
      </h2>

      <BitFieldVisualizer layout={layout} totalBits={totalBits} />

      {expanded && (
        <>
          <BitFieldEditor fields={fields} setFields={setFields} />
          <BitFieldValues
            values={values}
            setValues={setValues}
            layout={layout}
          />
          <div style={{ marginTop: 16 }}>
            <b>Total bits:</b> {totalBits}
          </div>
          {encodedBytes ? (
            <div style={{ marginTop: 8 }}>
              <b>Encoded Bytes:</b> {bytesToHex(encodedBytes)}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: "red" }}>
              Cannot encode (missing or invalid values).
            </div>
          )}
        </>
      )}
    </div>
  );
}
