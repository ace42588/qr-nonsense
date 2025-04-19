import { MODE } from "./Constants";
import { BitUtils } from "./Utilities.js";
import { NumericSegment, AlphanumericSegment, ByteSegment } from "./Segments";

function* createSegments(input, parentId, regex, SegmentClass, errorMsg) {
  const groups = input.match(regex);
  if (!groups) {
    throw new Error(errorMsg);
  }
  for (let i = 0; i < groups.length; i++) {
    yield new SegmentClass(groups[i], i, parentId);
  }
}

let lastSegmentID = 0;

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
      //header: [
      //  ...Encoder.computeModeIndicator(this.mode),
      //  ...Encoder.computeCharacterCountIndicator(data.length, this.mode),
      //],
      header: {
        mode: {
          bits: this.mode.bits,
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
    };
  }
}

// 7089 max
class NumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Numeric;
  }

  *encodeData(input, parentId) {
    yield* createSegments(
      input,
      parentId,
      /\d{1,3}/g,
      NumericSegment,
      `Invalid input for Numeric encoder: ${input}`
    );
  }
}

// 4296 max
class AlphanumericEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Alphanumeric;
  }

  *encodeData(input, parentId) {
    yield* createSegments(
      input,
      parentId,
      /[0-9A-Z \$\%\*\+\-\.\/\:]{1,2}/g,
      AlphanumericSegment,
      `Invalid input for Alphanumeric encoder: ${input}`
    );
  }
}

// 2953 max
class ByteEncoder extends Encoder {
  constructor() {
    super();
    this.mode = MODE.Byte;
  }

  *encodeData(input, parentId, encoding) {
    if (encoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const byte = parseInt(input.substring(i, i + 2), 16);
        yield new ByteSegment(byte, i / 2, parentId, encoding);
      }
    } else {
      // default for QR Codes
      const encoder = new TextEncoder("latin1");
      const chars = [...input];

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const byte = encoder.encode(char);
        yield new ByteSegment(byte, i, parentId);
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
