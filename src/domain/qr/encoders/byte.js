import { MODE } from "../Constants";
import { encodeSegment, validateLength, createCodon } from "./utility.js";

const mode = MODE.Byte;

const createByte = (value, text, inputEncoding = "utf-8") => createCodon(value, text, mode.name)

export function encodeByte(data, options) {
  let { inputEncoding } = options;
  
  switch (inputEncoding) {
      case "hex": {
      for (let i = 0; i < data.length; i += 2) {
        const hex = data.substring(i, i + 2);
        const byte = parseInt(data.substring(i, i + 2), 16);
        return { ...createCodon(byte, `0x${hex}`, mode.name), inputEncoding };
      }
  }
    default: {
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const byte = encoder.encode(char)[0];
        return { ...createCodon(byte, char, mode.name), inputEncoding: "utf-8" };
      }
    }
  }
  if (inputEncoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const hex = input.substring(i, i + 2);
        const byte = parseInt(input.substring(i, i + 2), 16);
        return { ...makeSegment(byte, `0x${hex}`, mode.name), inputEncoding };
      }
    } else {
      // default for QR Codes
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const byte = encoder.encode(char)[0];
        return { ...makeSegment(byte, char, mode.name), inputEncoding: "utf-8" };
      }
    }
}