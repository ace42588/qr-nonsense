import { encodeNumeric } from "./numeric";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeByte } from "./byte";
import { finalizeEncoding, getTerminatorLength } from "./utils";

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

export function getEncodedMessage(segments, version, errorCorrectionLevel) {
  return finalizeEncoding(segments, version, errorCorrectionLevel);
}
