import encodeNumeric from "./numeric";
import encodeAlphanumeric from "./alphanumeric";
import encodeByte from "./byte";


  /**
   * Encodes the data.
   * @param {string} data - Data to encode.
   * @param {string} encoding - Encoding type (e.g., "hex", "utf-8").
   * @returns {object} An object with header and segments.
   */
function  encode(data, inputEncoding) {
    let segments = [...createSegments(data, this.mode, inputEncoding)];
    const mode = {
      id: getId(),
      type: "modeIndicator",
      value: this.mode.bits,
      text: this.mode.name,
      isHighlighted: false,
      length: 4,
    };
    const characterCount = {
      id: getId(),
      type: "characterCountIndicator",
      value: data.length,
      text: data.length,
      length: Encoder.computeIndicatorLength(segments.length, this.mode),
      isHighlighted: false,
    };
    segments = [mode, characterCount, ...segments];

    const bitMap = new Map();
    const segmentMap = new Map();

    const modeBits = getBits(mode.value, mode.length);
    modeBits.forEach(({ id }) => bitMap.set(id, mode));
    //mode.bitIds = modeBits.map(({ id }) => id);
    const charCountBits = getBits(characterCount.value, characterCount.length);
    charCountBits.forEach(({ id }) => bitMap.set(id, characterCount));
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    const segmentBits = segments.flatMap((segment) => {
      const bits = getBits(segment.value, segment.length);
      segmentMap.set(segment.id, bits.map(({id}) => id));
      bits.forEach(({ id }) => bitMap.set(id, segment));
      return bits;
    });
    const bits = [...segmentBits];
    //mode.bitIds = modeBits.map(({ id }) => id);
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    //segments.bitIds = segmentBits.map(({ id }) => id);

    const encoded = {
      mode,
      characterCount,
      segments,
      segmentMap,
      bits,
      bitMap,
    };
    return encoded;
  }

export function finalizeEncoding(encodedInputs, requiredDataCodewords) {
  //console.debug("finalizeEncoding", { encodedInputs });
  let bits = encodedInputs.flatMap(({ bits }) => bits);
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits);
  bits = [...bits, ...termBits];
  //console.debug("finalizeEncoding", { termBits, bits });
  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits);
  bits = [...bits, ...fillBits];
  //console.debug("finalizeEncoding", { remainder, numFillBits, fillBits, bits });
  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) => {
    const byte = PAD_BYTES[i % 2];
    return getBits(byte, 8);
  });
  bits = [...bits, ...padBytes.flat()];
  //console.debug("finalizeEncoding", { padBytes, bits });
  return bits;
}

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