import { MODE, AlphaNumCharMap } from "./Constants";
import { BitUtils } from "./Utilities.js";
import { NumericSegment, AlphanumericSegment, ByteSegment } from "./Segments";

let lastSegmentID = 0;

function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

function makeSegment(value, text, inputMode) {
  return {
    id: lastSegmentID++,
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
      const { value, length } = encodeNonByte(groups[i]);
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

  static computeModeIndicator(mode) {
    const { bits } = mode;
    if (!bits) {
      throw new Error(`Invalid mode ${mode}`);
    }
    const modeBits = BitUtils.toPaddedBinary(bits, 4);
    return BitUtils.createTaggedBits(
      modeBits,
      "modeIndicator",
      mode.name,
      null
    );
  }

  static computeCharacterCountIndicator(charCount, mode) {
    const length = Encoder.computeIndicatorLength(charCount, mode);
    const charCountBits = BitUtils.toPaddedBinary(charCount, length);
    return BitUtils.createTaggedBits(
      charCountBits,
      "characterCount",
      charCount,
      null
    );
  }

  /**
   * Encodes the data.
   * @param {string} data - Data to encode.
   * @param {string} encoding - Encoding type (e.g., "hex", "utf-8").
   * @returns {object} An object with header and segments.
   */
  encode(data, chunkId, encoding) {
    const segments = [...this.encodeData(data, chunkId, encoding)];
    return {
      id: chunkId,
      header: {
        mode: {
          value: this.mode.bits,
          name: this.mode.name,
        },
        characterCount: {
          count: data.length,
          indicatorLength: Encoder.computeIndicatorLength(
            segments.length,
            this.mode
          ),
        },
      },
      segments,
      childIds: segments.map(({ id }) => id),
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
  /**
   * Encodes the ECI assignment number.
   * @param {number} input - The assignment number.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  static encode(input, id) {
    const length = input < 256 ? 8 : 16;
    const bits = BitUtils.toPaddedBinary(input, length);
    return [
      ...Encoder.computeModeIndicator(MODE.ECI),
      ...BitUtils.createTaggedBits(bits, "assignmentNumber", input, null),
    ];
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
