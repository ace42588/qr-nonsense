import { encodeSegment, validateLength, createCodon } from "./utils.js";

const mode = {
  name: "byte",
  bits: 0x4,
  thresholds: [
    { max: 256, length: 8 },
    { max: Infinity, length: 16 },
  ],
};

const createByte = (value, text, inputEncoding = "utf-8") => {
  const codon = createCodon(value, text, mode.name, 8);
  return { ...codon, inputEncoding };
};

export function* iteratorFunc(data, options) {
  //console.debug("byte:iteratprFunc", { data, options });
  let inputEncoding = options;

  switch (inputEncoding) {
    case "hex": {
      for (let i = 0; i < data.length; i += 2) {
        const hex = data.substring(i, i + 2);
        const byte = parseInt(data.substring(i, i + 2), 16);
        //console.debug({hex, byte});
        yield createByte(byte, `0x${hex}`, inputEncoding);
      }
      break;
    }
    default: {
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const byte = encoder.encode(char)[0];
        yield createByte(byte, char, inputEncoding);
      }
    }
  }
}

export const encodeByte = (input, options) =>
  encodeSegment(input, mode, (data) => iteratorFunc(data, options));
