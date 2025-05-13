import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { addTerminator, createPart, getTerminatorLength } from "./utils";
import { getMinimumQRCodeVersion } from "../versionUtils";

export function encodeInput(mode, input, options = {}) {
  console.debug("encodeInput", { mode, input, options });
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

export function encodeAll(parsedInputs) {
  console.debug("encodeAll", { parsedInputs });
  const encodedInputs = parsedInputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, encoding)
  );
}

export function finalizeEncoding(segments, numDataCodewords) {
  const CodewordLength = 8;
  const PAD_BYTES = [236, 17];
  
  const numDataBits = () => segments.reduce((total, s) => total + s.length, 0);

  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(numDataCodewords, numDataBits());
  if (numTermBits > 0)
    segments.push(createPart("terminator", 0, numTermBits, numTermBits));

  // add filler bits to complete the last codeword
  const remainder = numDataBits() % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  if (numFillBits > 0)
    segments.push(createPart("fill", 0, numFillBits, numFillBits));

  // add padding to fill the capacity
  const numPadBytes =
    numDataCodewords - Math.ceil(numDataBits() / CodewordLength);
  const padding = Array.from({ length: numPadBytes }, (_, i) =>
    createPart("padding", PAD_BYTES[i % 2], PAD_BYTES[i % 2], 8)
  );
  segments = [...segments, ...padding];

  return segments;
}