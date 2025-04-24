import { MODE, AlphaNumCharMap, CodewordLength, PAD_BYTES } from "./Constants";
import { getBits } from "../BitUtils";

let lastSegmentId = 0;

// ~24k bits possible
function getId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return `segment-${lastSegmentId++}`;
}

function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

function makeSegment(value, text, inputMode) {
  return {
    type: "segment",
    id: getId(),
    value,
    text,
    inputMode,
    isHighlighted: false,
    length: 8,
  };
}

function encodeNumeric(data) {
  validateLength(data, 1, 3, "Numeric");
  const value = parseInt(data, 10);
  const length = value.toString().length * 3 + 1;
  return {
    value,
    length,
  };
}

function encodeAlphanumeric(data) {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = AlphaNumCharMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value =
      AlphaNumCharMap.indexOf(data[0]) * 45 + AlphaNumCharMap.indexOf(data[1]);
    length = 11;
  }
  return { value, length };
}

function encodeNonByte(data, mode) {
  const { name } = mode;
  if (name === "numeric") return encodeNumeric(data);
  if (name === "alphanumeric") return encodeAlphanumeric(data);
  throw new Error(`Invalid mode: ${name}`);
}

function* createSegments(input, mode, inputEncoding) {
  //console.debug("createSegments", {input, mode, inputEncoding});
  if (!input || !mode)
    throw new Error(`Invalid arguments for createSegments() ${arguments}`);
  if (mode.name === "byte") {
    if (inputEncoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const hex = input.substring(i, i + 2);
        const byte = parseInt(input.substring(i, i + 2), 16);
        yield { ...makeSegment(byte, `0x${hex}`, mode.name), inputEncoding };
      }
    } else {
      // default for QR Codes
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const byte = encoder.encode(char)[0];
        yield { ...makeSegment(byte, char, mode.name), inputEncoding: "utf-8" };
      }
    }
  } else {
    const groups = input.match(mode.groupingRegex);
    if (!groups) {
      throw new Error(`Invalid input for ${mode.name} encoder: ${input}`);
    }
    for (let i = 0; i < groups.length; i++) {
      //yield new SegmentClass(groups[i], i, parentId);
      const { value, length } = encodeNonByte(groups[i], mode);
      yield { ...makeSegment(groups[i], groups[i], mode.name), value, length };
    }
  }
}

class Encoder {
  /**
   * Computes the bit-length indicator based on thresholds.
   * @param {number} charCount - The character count.
   * @param {object} mode - The mode object.
   * @returns {number} The indicator length.
   */
  static computeIndicatorLength(charCount, mode) {
    if (!mode.thresholds) {
      throw new Error(
        `Mode ${mode.toString()} does not support a character count indicator.`
      );
    }
    const { thresholds } = mode;
    for (const { max, length } of thresholds) {
      if (charCount < max) return length;
    }
    return thresholds[thresholds.length - 1].length;
  }

  /**
   * Encodes the data.
   * @param {string} data - Data to encode.
   * @param {string} encoding - Encoding type (e.g., "hex", "utf-8").
   * @returns {object} An object with header and segments.
   */
  encode(data, inputEncoding) {
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
      segmentMap.set(
        segment.id,
        bits.map(({ id }) => id)
      );
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
}

// 7089 max
class NumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Numeric;
  }

  *encodeData(input) {
    yield* createSegments(input, this.mode);
  }
}

// 4296 max
class AlphanumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Alphanumeric;
  }

  *encodeData(input) {
    yield* createSegments(input, this.mode);
  }
}

// 2953 max
class ByteEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Byte;
  }

  *encodeData(input, inputEncoding) {
    if (inputEncoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const hex = input.substring(i, i + 2);
        const byte = parseInt(input.substring(i, i + 2), 16);
        yield { ...makeSegment(byte, `0x${hex}`, "Byte"), inputEncoding };
      }
    } else {
      // default for QR Codes
      const encoder = new TextEncoder("latin1");
      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const byte = encoder.encode(char)[0];
        yield { ...makeSegment(byte, char, "Byte"), inputEncoding: "utf-8" };
      }
    }
  }
}

class EciEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.ECI;
  }
  /**
   * Encodes the ECI assignment number.
   * @param {number} input - The assignment number.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  static encode(input, id) {
    const length = input < 256 ? 8 : 16;
    const mode = {
      value: this.mode.bits,
      text: this.mode.name,
      length: 4,
    };
    const segment = makeSegment(input, input, "ECI");

    return {
      mode,
      segments: [{ ...segment, length }],
    };
  }
}

const encoders = {
  eci: new EciEncoder(),
  numeric: new NumericEncoder(),
  alphanumeric: new AlphanumericEncoder(),
  byte: new ByteEncoder(),
  kanji: {
    encode: () => {
      throw new Error("Kanji mode not implemented");
    },
  },
};

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
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

export function getEncoder(mode) {
  if (!mode) throw new Error("Mode is required.");

  const selected = encoders[mode.toLowerCase()];

  if (!selected) throw new Error(`No encoder for ${mode.toString()}`);

  return selected;
}
