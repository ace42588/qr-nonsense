import {
  NumericSegment,
  AlphanumericSegment,
  ByteSegment,
} from "../encode/Segment";
import { TaggedBit } from "../encode/TaggedBit";

const MODE = {
  Terminator: {
    toString: () => "terminator",
    bits: 0x0,
  },
  Numeric: {
    toString: () => "numeric",
    bits: 0x1,
    thresholds: [
      { max: 10, length: 10 },
      { max: 1000, length: 12 },
      { max: Infinity, length: 14 },
    ],
  },
  Alphanumeric: {
    toString: () => "alphanumeric",
    bits: 0x2,
    thresholds: [
      { max: 45, length: 9 },
      { max: 1225, length: 11 },
      { max: Infinity, length: 13 },
    ],
  },
  //StructuredAppend: 0x3,
  Byte: {
    toString: () => "byte",
    bits: 0x4,
    thresholds: [
      { max: 256, length: 8 },
      { max: Infinity, length: 16 },
    ],
  },
  //FNC1FirstPosition: 0x5,
  ECI: {
    toString: () => "eci",
    bits: 0x7,
  },
  Kanji: {
    toString: () => "kanji",
    bits: 0x8,
  },
  //FNC1SecondPosition: 0x9,
};

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
   * Creates an array of TaggedBit instances from a string of bits.
   * @param {string} bits - The binary string.
   * @param {string} type - Type of the bit.
   * @param {*} source - Source identifier.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  static createTaggedBits(bits, type, source) {
    return [...bits].map(
      (bit) =>
        new TaggedBit({
          bit,
          type,
          source,
          encoding: "none",
        })
    );
  }
  static addModeIndicator(mode) {
    const { bits } = mode;
    if (!bits) {
      throw new Error(`Invalid mode ${mode}`);
    }
    const modeBits = bits.toString(2).padStart(4, "0");
    return Encoder.createTaggedBits(modeBits, "mode", mode);
  }

  static addCharacterCountIndicator(charCount, mode) {
    const length = Encoder.computeIndicatorLength(charCount, mode);
    const charCountBits = charCount.toString(2).padStart(length, "0");
    return Encoder.createTaggedBits(charCountBits, "characterCount", charCount);
  }

  /**
   * Encodes the data.
   * @param {string} data - Data to encode.
   * @param {string} encoding - Encoding type (e.g., "hex", "utf-8").
   * @returns {object} An object with header and segments.
   */
  encode(data, encoding) {
    return {
      header: [
        ...Encoder.addModeIndicator(this.mode),
        ...Encoder.addCharacterCountIndicator(data.length, this.mode),
      ],
      segments: [...this.encodeData(data, encoding)],
    };
  }
}

class NumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Numeric;
  }

  *encodeData(input) {
    const groupsOfThree = input.match(/\d{1,3}/g);
    if (!groupsOfThree) {
      throw new Error(`Invalid input for Numeric encoder: ${input.toString()}`);
    }
    for (let i = 0; i < groupsOfThree.length; i++) {
      yield new NumericSegment(groupsOfThree[i], i);
    }
  }
}

class AlphanumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Alphanumeric;
  }

  *encodeData(input) {
    const pairs = input.match(/[0-9A-Z \$\%\*\+\-\.\/\:]{1,2}/g);
    if (!pairs) {
      throw new Error(
        `Invalid input for Alphanumeric encoder: ${input.toString()}`
      );
    }

    for (let i = 0; i < pairs.length; i++) {
      yield new AlphanumericSegment(pairs[i], i);
    }
  }
}

class ByteEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Byte;
  }

  *encodeData(input, encoding) {
    if (encoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const byte = parseInt(input.substring(i, i + 2), 16);
        yield new ByteSegment(byte, i / 2, encoding);
      }
    } else {
      // default for QR Codes
      const encoder = new TextEncoder("latin1");
      const chars = [...input];

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const byte = encoder.encode(char);
        yield new ByteSegment(byte, i);
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
  static encode(input) {
    const bits = input.toString(2).padStart(input < 256 ? 8 : 16, "0");
    return [
      ...Encoder.addModeIndicator(MODE.ECI),
      ...Encoder.createTaggedBits(bits, "assignmentNumber", input),
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
  
  return
}
