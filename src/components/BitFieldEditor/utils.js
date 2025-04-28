export function bitsNeeded(max) {
  return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
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

export function encodeFieldsToBytes(fieldsLayout, values) {
  let result = 0;

  fieldsLayout.forEach((field) => {
    const value = values[field.label];
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
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomObject(fields) {
  const obj = {};
  for (const field of fields) {
    const { label, min, max } = field;
    obj[label] = randomInt(min, max);
  }
  return obj;
}

export function generateRandomPacket({ headerFields, itemFields, itemCount }) {
  // Step 1: Generate header
  const headerValues = generateRandomObject(headerFields);

  // Step 2: Generate items
  const items = Array.from({ length: itemCount }, () =>
    generateRandomObject(itemFields)
  );

  // Step 3: Encode
  const headerLayout = generateBitLayout(headerFields).layout;
  const itemLayout = generateBitLayout(itemFields).layout;

  const headerBytes = encodeFieldsToBytes(headerLayout, headerValues);

  // Encode each item and concatenate
  const itemBytesArray = items.map((item) =>
    encodeFieldsToBytes(itemLayout, item)
  );
  const totalItemBytes = itemBytesArray.reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  const packet = new Uint8Array(headerBytes.length + totalItemBytes);

  // Step 4: Copy into one array
  packet.set(headerBytes, 0);
  let offset = headerBytes.length;
  for (const itemBytes of itemBytesArray) {
    packet.set(itemBytes, offset);
    offset += itemBytes.length;
  }

  return {
    packet, // Final Uint8Array
    headerValues,
    items,
  };
}
