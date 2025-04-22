import { MODE } from "../Constants";
import { encodeSegment, validateLength, createCodon } from "./utility.js";

const mode = MODE.Byte;

const createByte = (value, text, inputEncoding = "utf-8") => {
  const codon = createCodon(value, text, mode.name);
  return { ...codon, inputEncoding };
};

export function encodeByte(data, options) {
  let { inputEncoding } = options;

  switch (inputEncoding) {
    case "hex": {
      for (let i = 0; i < data.length; i += 2) {
        const hex = data.substring(i, i + 2);
        const byte = parseInt(data.substring(i, i + 2), 16);
        return createByte(hex, `0x${hex}`, inputEncoding);
      }
    }
    default: {
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const byte = encoder.encode(char)[0];
        return createByte(byte, char, inputEncoding);
      }
    }
  }
}
