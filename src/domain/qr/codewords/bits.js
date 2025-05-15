// src/domain/qr/codewords/bits.js
function getId() {
  return `${crypto.randomUUID()}`;
}

function getBit(value, sourceId, sourceType) {
  if (!sourceId) throw new Error("Missing source ID");
  return {
    type: sourceType,
    value,
    id: getId(),
    sourceId,
  };
}

export function getBits(value, length, source) {
  if (!source) throw new Error("Missing source");
  if (!!value && length) {
    value = value.toString(2).padStart(length, "0");
  }
  //console.debug("getBits", { value, length, parentId });
  switch (typeof value) {
    case "string": {
      const re = /[01]{2,}/gm;
      if (!re.test(value))
        throw new Error(
          `Invalid string value for getBits(): ${JSON.stringify(value)}`
        );
      const bits = [...value].map((bit) =>
        getBit(parseInt(bit), source.id, source.type)
      );
      return bits;
    }
    case "number": {
      if (value < 0 || value > 255)
        throw new Error(
          `Invalid byte value for getBits(): ${value.toString()}`
        );
      const bits = Array.from({ length }).map((_, idx) =>
        getBit((value >> (7 - idx)) & 1, source.id, source.type)
      );
      return bits;
    }
    default: {
      throw new Error(`Invalid value for getBits(): ${JSON.stringify(value)}`);
    }
  }
}

export function bitsToByte(bits) {
  if (bits.length !== 8) throw new Error("Invalid bits!" + JSON.stringify(bits));
  return bits.reduce((byte, { value }, idx) => (byte << 1) | value, 0);
}