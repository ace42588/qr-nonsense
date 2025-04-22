import encodeNumeric from "./numeric";
import encodeAlphanumeric from "./alphanumeric";
import encodeByte from "./byte";
import encodeSegment from "./utility.js"



export function encodeInput(mode, input, options = {}) {
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