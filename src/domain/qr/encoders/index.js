import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { encodeKanji } from "./kanji";
import { encodeEci } from "./eci";
import { encodeMixed } from "./mixed";
import {
  AUTO_MODE,
  MIXED_MODE,
  OPTIMIZED_MODE,
  encodeOptimized,
} from "./optimize";
import { addFill, addPadding, addTerminator, getNumBits } from "./utils";

function mixedEncodeOptions(options, version) {
  const encoding =
    options != null && typeof options === "object" && !Array.isArray(options)
      ? options.encoding
      : options;
  const cciVersion =
    options != null &&
    typeof options === "object" &&
    typeof options.version === "number"
      ? options.version
      : version;
  return { encoding, version: cciVersion };
}

export function encodeInput(mode, input, options = {}, version = 1) {
  const data = input ?? "";
  switch (mode) {
    case "numeric":
      return encodeNumeric(data, options);
    case "alphanumeric":
      return encodeAlphanumeric(data, options);
    case "byte":
      return encodeByte(data, options);
    case "kanji":
    case "kanjiMode":
      return encodeKanji(data);
    case "eci":
      return encodeEci(data, options);
    case MIXED_MODE:
    case AUTO_MODE: {
      return encodeMixed(data, mixedEncodeOptions(options, version));
    }
    case OPTIMIZED_MODE: {
      return encodeOptimized(data, mixedEncodeOptions(options, version));
    }
    default:
      throw new Error(`Unsupported QR encoding mode: ${mode}`);
  }
}

export function encodeAll(parsedInputs, version = 1) {
  const parsedValues = Object.values(parsedInputs);
  const errors = [];
  const encodedInputs = parsedValues.flatMap((parsed) => {
    const { data, mode, encoding, error, id } = parsed || {};
    if (error) {
      errors.push(error);
      return [];
    }
    try {
      const symbols = encodeInput(mode, data, encoding, version);
      if (!id) return symbols;
      return symbols.map((symbol) => ({ ...symbol, inputId: id }));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      return [];
    }
  });
  return [encodedInputs, getNumBits(encodedInputs), errors[0] ?? null];
}

export function finalizeEncoding(segments, numDataCodewords) {
  // Add terminator bits, based on version capacity
  const terminated = addTerminator(segments, numDataCodewords);

  // add filler bits to complete the last codeword
  const filled = addFill(terminated, numDataCodewords);

  // add padding to fill the capacity
  const padded = addPadding(filled, numDataCodewords);

  return padded;
}
