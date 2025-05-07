let lastBitId = 0;

// ~24k bits possible
function getId() {
  if (lastBitId >= 0xffff) lastBitId = 0;

  return `bit-${lastBitId++}`;
}

function getBit(value, sourceId, sourceType) {
  if (!sourceId) throw new Error("Missing source ID");
  return {
    type: "bit",
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
