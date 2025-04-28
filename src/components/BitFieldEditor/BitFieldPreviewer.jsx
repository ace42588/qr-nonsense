import React, { useMemo, useState } from "react";
import BitFieldVisualizer from "./BitFieldVisualizer";
import { generateBitLayout, encodeFieldsToBytes, bytesToHex } from "./utils";

export default function BitFieldPreviewer({ fields }) {
  const { layout, totalBits } = useMemo(
    () => generateBitLayout(fields),
    [fields]
  );
  const [values, setValues] = useState({});

  const encodedBytes = useMemo(() => {
    try {
      return encodeFieldsToBytes(layout, values);
    } catch (err) {
      return null;
    }
  }, [layout, values]);

  return (
    <div>
      <h3>Sample Values</h3>
      {layout.map((field) => (
        <div key={field.label} style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 8 }}>{field.label}</label>
          <input
            type="number"
            value={values[field.label] ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                [field.label]:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            style={{ width: 80 }}
          />
          <span style={{ marginLeft: 8, color: "#888" }}>
            ({field.width} bits, {field.startBit}→{field.endBit})
          </span>
        </div>
      ))}

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

      <BitFieldVisualizer layout={layout} totalBits={totalBits} />
    </div>
  );
}
