import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { addFill, addPadding, addTerminator } from "./utils";
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
  // Add terminator bits, based on version capacity
  const terminated = addTerminator(segments, numDataCodewords);

  // add filler bits to complete the last codeword
  const filled = addTerminator(terminated, numDataCodewords);

  // add padding to fill the capacity
  const padded = addPadding(filled, numDataCodewords);

  return padded;
}