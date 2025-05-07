import { getBits } from "../bitUtils";

import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { CodewordLength, getTerminatorLength } from "./utils";

const PAD_BYTES = [236, 17];

const terminator = {
  name: "terminator",
  id: "terminator",
  type: "terminator",
  value: 0
}

const fill = {
  name: "fill",
  id: "fill",
  type: "fill",
  value: 0
}

const pad = {
  name: "pad",
  id: "pad",
  type: "pad",
}

export function encodeInput(mode, input, options = {}) {
  //console.debug("encodeInput", { mode, input, options });
  if (!input || input === "") return [];
  switch (mode) {
    case "numeric":
      return encodeNumeric(input, options);
    case "alphanumeric":
      return encodeAlphanumeric(input, options);
    case "byte":
      return encodeByte(input, options);
    // case "kanji": return encodeKanji(input, options);
    default:
      throw new Error(`Unsupported QR encoding mode: ${mode}`);
  }
}

export function encodeMessage(inputs = []) {
  const segments = inputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, { inputEncoding: encoding })
  );
}

export function finalizeEncoding(bits, requiredDataCodewords) {
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits, terminator);
  bits = [...bits, ...termBits];

  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits, fill);
  bits = [...bits, ...fillBits];

  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) =>
    getBits(PAD_BYTES[i % 2], 8, pad)
  );

  return [...bits, ...padBytes.flat()];
}
