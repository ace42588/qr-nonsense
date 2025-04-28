import React, { useMemo, useState } from "react";
import BitFieldVisualizer from "./BitFieldVisualizer";

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function generateBitLayout(fields) {
  const withBits = fields.map(field => ({
    ...field,
    bits: bitsNeeded(field.max)
  }));

  const totalBits = withBits.reduce((sum, field) => sum + field.bits, 0);

  let currentBit = totalBits - 1;
  const layout = withBits.map(field => {
    const start = currentBit;
    const end = currentBit - field.bits + 1;
    currentBit -= field.bits;
    return {
      label: field.label,
      min: field.min,
      max: field.max,
      startBit: start,
      endBit: end,
      width: field.bits
    };
  });

  return { layout, totalBits };
}

function encodeFieldsToBytes(fieldsLayout, values) {
  let result = 0;

  fieldsLayout.forEach(field => {
    const value = values[field.label];
    if (value === undefined) {
      throw new Error(`Missing value for field: ${field.label}`);
    }
    if (value < field.min || value > field.max) {
      throw new Error(`Value for ${field.label} out of allowed range (${field.min} to ${field.max})`);
    }

    result |= (value & ((1 << field.width) - 1)) << field.endBit;
  });

  const totalBits = fieldsLayout[0].startBit + 1;
  const totalBytes = Math.ceil(totalBits / 8);

  const bytes = new Uint8Array(totalBytes);
  for (let i = 0; i < totalBytes; i++) {
    bytes[i] = (result >> (8 * (totalBytes - i - 1))) & 0xFF;
  }

  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function BitFieldPreviewer({ fields }) {
  const { layout, totalBits } = useMemo(() => generateBitLayout(fields), [fields]);
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
      <h2>Live Preview</h2>

      {layout.map(field => (
        <div key={field.label} style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 8 }}>{field.label}</label>
          <input
            type="number"
            value={values[field.label] ?? ""}
            onChange={e => setValues(v => ({ ...v, [field.label]: e.target.value === "" ? undefined : Number(e.target.value) }))}
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
