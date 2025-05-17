import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { addFill, addPadding, addTerminator, getNumBits } from "./utils";

export function encodeInput(mode, input, options = {}) {
  console.debug("encodeInput", { mode, input, options });

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
  //console.debug("encodeAll", { parsedInputs });
  const parsedValues = Object.values(parsedInputs);
  const encodedInputs = parsedValues.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, encoding)
  );
  return [encodedInputs, getNumBits(encodedInputs)];
}

export function finalizeEncoding(segments, numDataCodewords) {
  //console.debug("finalizeEncoding", { segments, numDataCodewords });
  // Add terminator bits, based on version capacity
  const terminated = addTerminator(segments, numDataCodewords);
  //console.debug("finalizeEncoding", { terminated });

  // add filler bits to complete the last codeword
  const filled = addFill(terminated, numDataCodewords);
  //console.debug("finalizeEncoding", { filled });

  // add padding to fill the capacity
  const padded = addPadding(filled, numDataCodewords);
  //console.debug("finalizeEncoding", { padded });

  return padded;
}
