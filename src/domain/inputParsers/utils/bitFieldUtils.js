// /encoders/bitFieldUtils.js

function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
}

function getValueFromPath(obj, path) {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function generateBitLayout(fields) {
  //console.debug("generateBitLayout", { fields });
  const withBits = fields.map((field) => ({
    ...field,
    bits: bitsNeeded(field.max),
  }));

  const totalBits = withBits.reduce((sum, field) => sum + field.bits, 0);

  let currentBit = totalBits - 1;
  const layout = withBits.map((field) => {
    const start = currentBit;
    const end = currentBit - field.bits + 1;
    currentBit -= field.bits;
    return {
      type: field.type,
      label: field.label,
      min: field.min,
      max: field.max,
      startBit: start,
      endBit: end,
      width: field.bits,
    };
  });

  return { layout, totalBits };
}

export function generateBitLayoutFromSchema(schema, prefix = "") {
  const layout = [];
  const properties = schema.properties || {};

  for (const [key, propSchema] of Object.entries(properties)) {
    const name = prefix ? `${prefix}.${key}` : key;

    if (propSchema.type === "object") {
      layout.push(...generateBitLayoutFromSchema(propSchema, name));
    } else if (propSchema.type === "integer") {
      if (typeof propSchema.bits !== "number") {
        throw new Error(`Missing 'bits' for field: ${name}`);
      }
      layout.push({
        label: name,
        type: "integer",
        min: 0,
        max: (1 << propSchema.bits) - 1,
        bits: propSchema.bits,
      });
    }
    // Arrays are handled separately
  }

  return layout;
}

export function encodeFieldsToBytes(fieldsLayout, values) {
  //console.debug("encodeFieldsToBytes", { fieldsLayout, values });
  let result = 0;

  try {
    fieldsLayout.forEach((field) => {
      const value = getValueFromPath(values, field.label);
      if (value === undefined) {
        throw new Error(`Missing value for field: ${field.label}`);
      }
      if (value < field.min || value > field.max) {
        throw new Error(
          `Value for ${field.label} out of allowed range (${field.min} to ${field.max})`
        );
      }

      result |= (value & ((1 << field.width) - 1)) << field.endBit;
    });

    const totalBits = fieldsLayout[0].startBit + 1;
    const totalBytes = Math.ceil(totalBits / 8);

    const bytes = new Uint8Array(totalBytes);
    for (let i = 0; i < totalBytes; i++) {
      bytes[i] = (result >> (8 * (totalBytes - i - 1))) & 0xff;
    }

    return bytes;
  } catch {
    return null;
  }
}

export function bytesToHex(bytes) {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
