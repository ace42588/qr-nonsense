import { MODE, AlphaNumCharMap } from "./Constants";
import { getBits } from "./utils/BitUtils";
import { NumericSegment, AlphanumericSegment, ByteSegment } from "./Segments";

let lastSegmentId = 0;

// ~24k bits possible
function getId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return lastSegmentId++;
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
    id: getId(),
    value,
    text,
    inputMode,
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
        const byte = encoder.encode(char);
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
      const { value, length } = encodeNonByte(groups[i], mode.name);
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
  encode(data, chunkId, encoding) {
    const segments = [...this.encodeData(data, chunkId, encoding)];
    const mode = {
      value: this.mode.bits,
      text: this.mode.name,
      length: 4,
    };
    const modeBits = getBits(mode.value, mode.length);
    mode.bitIds = modeBits.map(({ id }) => id);
    const characterCount = {
      value: segments.length,
      length: Encoder.computeIndicatorLength(segments.length, this.mode),
    };
    return {
      mode,
      characterCount,
      segments,
      bitIds: segments.map(({ id }) => id),
    };
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
  kanji: () => {
    throw new Error("Kanji mode not implemented");
  },
};

export default function GetEncoder(mode) {
  if (!mode) throw new Error("Mode is required.");

  const selected = encoders[mode.toLowerCase()];

  if (!selected) throw new Error(`No encoder for ${mode.toString()}`);

  return selected;
}
