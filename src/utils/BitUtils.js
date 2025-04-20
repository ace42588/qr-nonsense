import { PAD_BYTES, CodewordLength } from "../Constants";

let lastBitId = 0;

// ~24k bits possible
function getId() {
  if (lastBitId >= 0xffff) lastBitId = 0;

  return `bit-${lastBitId++}`;
}

function getBit(value) {
  return {
    type: "bit",
    value,
    id: getId(),
  };
}

// ~24k bits possible
export function getBits(value, length, source) {
  if (!!value && length) {
    value = value.toString(2).padStart(length, "0");
  }
  console.debug("getBits", {value, length, source});
  switch (typeof value) {
    case "string": {
      const re = /[01]{2,}/gm;
      if (!re.test(value))
        throw new Error(
          `Invalid string value for getBits(): ${JSON.stringify(value)}`
        );
      return [...value].map((bit) => getBit(parseInt(bit)));
    }
    case "number": {
      if (value < 0 || value > 255)
        throw new Error(
          `Invalid byte value for getBits(): ${value.toString()}`
        );
      return Array.from({ length }).map((_, idx) =>
        getBit((value >> (7 - idx)) & 1)
      );
    }
    default: {
      throw new Error(`Invalid value for getBits(): ${JSON.stringify(value)}`);
    }
  }
}
