import { TaggedBit } from "./TaggedBit";

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
  StructuredAppend: {
    toString: () => "StructuredAppend",
    bits: 0x3,
  },
  Byte: {
    toString: () => "byte",
    bits: 0x4,
    thresholds: [
      { max: 256, length: 8 },
      { max: Infinity, length: 16 },
    ],
  },
  FNC1FirstPosition: {
    toString: () => "FNC1FirstPosition",
    bits: 0x5,
  },
  ECI: {
    toString: () => "eci",
    bits: 0x7,
  },
  Kanji: {
    toString: () => "kanji",
    bits: 0x8,
  },
  FNC1SecondPosition: {
    toString: () => "FNC1SecondPosition",
    bits: 0x9,
  },
};

const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

class Segment {
  constructor(data, index) {
    this.data = data;
    this.index = index;
  }

  get bits() {
    const bitStr = this._value.toString(2).padStart(this.length, "0");
    return [...bitStr].map(
      (bit, idx) =>
        new TaggedBit({
          bit,
          type: "data",
          source: this,
          idx,
        })
    );
  }
  
  get encoding() {
    return this.mode.toString();
  }

  get value() {
    return this.bits.reduce((val, bit) => {
      return (val << 1) | bit.value;
    });
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.bits.length; i++) {
      yield this.bits[i];
    }
  }
}

class NumericSegment extends Segment {
  constructor(data, index) {
    super(data, index);
    this.mode = MODE.Numeric;
    if (data.length > 3 || data.length < 1) {
      throw new Error("NumericSegment must have 1-3 numeric characters!");
    }
    this._value = parseInt(this.data, 10);
    this.length = this._value.toString().length * 3 + 1;
  }

  toString() {
    return this.value.toString().padStart(this.data.length, "0");
  }
}

class AlphanumericSegment extends Segment {
  constructor(data, index) {
    super(data, index);
    this.mode = MODE.AlphanumericSegment;
    if (data.length > 3 || data.length < 1) {
      throw new Error(
        `AlphanumericSegment must have 1-2 characters from the class [${AlphaNumCharMap}]!`
      );
    }
    if (data.length === 1) {
      this._value = AlphaNumCharMap.indexOf(data[0]);
      this.length = 6;
    } else if (data.length === 2) {
      this._value =
        AlphaNumCharMap.indexOf(data[0]) * 45 +
        AlphaNumCharMap.indexOf(data[1]);
      this.length = 11;
    }
  }

  toString() {
    let text;
    if (this.length === 11) {
      const a = Math.floor(this.value / 45);
      const b = this.value % 45;
      text = AlphaNumCharMap[a] + AlphaNumCharMap[b];
    } else {
      text = AlphaNumCharMap[this.value];
    }
    return text;
  }
}

class ByteSegment extends Segment {
  constructor(data, index, encoding) {
    super(data & 0xff, index);
    this.encoding = encoding ? encoding : "latin-1";
    this._value = this.data;
    this.length = 8;
  }

  toString() {
    if (this.encoding === "hex") return `0x${this.value.toString(16)}`;

    return String.fromCharCode(this.value);
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

  static getModeIndicator(mode) {
    const { bits } = mode;
    if (!bits) {
      throw new Error(`Invalid mode ${mode}`);
    }
    const modeBits = bits.toString(2).padStart(4, "0");
    return Encoder.createTaggedBits(modeBits, "mode", mode);
  }

  static getCharacterCountIndicator(charCount, mode) {
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
        ...Encoder.getModeIndicator(this.mode),
        ...Encoder.getCharacterCountIndicator(data.length, this.mode),
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

  return selected;
}
