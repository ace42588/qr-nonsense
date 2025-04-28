import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { CodewordLength, PAD_BYTES } from "./Constants";
import { getBits } from "../bitUtils";
import { getTerminatorLength } from "./utility";

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

export function finalizeEncoding(bits, requiredDataCodewords) {
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits);
  bits = [...bits, ...termBits];

  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits);
  bits = [...bits, ...fillBits];

  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) =>
    getBits(PAD_BYTES[i % 2], 8)
  );

  return [...bits, ...padBytes.flat()];
}
