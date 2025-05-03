import React, { useMemo, useState } from "react";
import { encodeFieldsToBytes, bytesToHex } from "./utils";

export default function BitFieldPreviewer({
  fields,
  sampleValues,
  layout,
  totalBits,
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState(sampleValues|| {});

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
    <div>
      <h3 onClick={toggleExpanded}>
        <span style={{ marginRight: 8 }}>{expanded ? "▾" : "▸"}</span>Preview
      </h3>
      {expanded && (
        <>
          {layout.map((field) => (
            <div
              key={field.label}
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                justifyContent: "space-between",
              }}
            >
              <label style={{ marginRight: 8, minWidth: 100 }}>
                {field.label}
              </label>
              <span style={{ marginLeft: 8, color: "#888" }}>
                ({field.width} bits, {field.startBit}→{field.endBit})
              </span>
              <input
                type="number"
                value={values[field.label] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [field.label]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                style={{ maxWidth: 100 }}
              />
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
        </>
      )}
    </div>
  );
}
