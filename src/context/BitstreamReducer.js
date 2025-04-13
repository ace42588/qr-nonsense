import {
  NumericSegment,
  AlphanumericSegment,
  ByteSegment,
} from "../encode/Segment";
import { TaggedBit } from "../encode/TaggedBit";

import { VERSIONS } from "./version";

const PAD_BYTES = [
  [
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
  ],
  [
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 17, encoding: "none" }),
  ],
];

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
  static computeIndicatorLength(charCount, mode) {
    const { thresholds } = mode;
    for (const { max, length } of thresholds) {
      if (charCount < max) return length;
    }
    return thresholds[thresholds.length - 1].length;
  }
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
      const chars = [...input];
      const encoder = new TextEncoder("latin1");

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const byte = encoder.encode(char);
        yield new ByteSegment(byte, i);
      }
    }
  }
}

class EciEncoder extends Encoder {
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
    throw new Error("Type not implemented");
  },
};

function finalize(bits, versionNum, errorCorrectionLevel) {
  const { errorCorrectionLevels } = VERSIONS[versionNum - 1];
  const { ecCodewordsPerBlock, ecBlocks } =
    errorCorrectionLevels[errorCorrectionLevel];

  const requiredDataCodewords = ecBlocks.reduce(
    (t, { numBlocks, dataCodewordsPerBlock }) =>
      t + numBlocks * dataCodewordsPerBlock,
    0
  );
  let finalBits = [...bits];
  let bitStr;
  let requiredBits = requiredDataCodewords * 8;
  let remaining = requiredBits - bits.length;
  // add terminator if there is space
  if (0 < remaining <= 4) {
    bitStr = "".padStart(remaining, "0");
  }
  const termBits = [...bitStr].map(
    (bit) =>
      new TaggedBit({
        bit,
        type: "terminator",
        source: "terminator",
      })
  );
  finalBits = [...finalBits, ...termBits];
  // bits needed to fill the codeword
  remaining = 8 - (finalBits.length % 8);
  if (0 < remaining < 8) {
    bitStr = "".padStart(remaining, "0");
  }
  const fillBits = [...bitStr].map(
    (bit) =>
      new TaggedBit({
        bit,
        type: "terminator",
        source: "fill",
      })
  );
  finalBits = [...finalBits, ...fillBits];
  const currentCodewords = finalBits.length / 8;
  const codewordsNeeded = requiredDataCodewords - currentCodewords;
  for (let i = 0; i < codewordsNeeded; i++) {
    finalBits = [...finalBits, ...PAD_BYTES[i % 2]];
  }

  return finalBits;
}

export default function BitstreamReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const { segments: newSegments, bits: newBits } = encoders[mode].encode(
        data,
        encoding
      );
      const finalBits = finalize();
      return {
        ...state,
        segments: [...state.segments, ...newSegments],
        bits: [...state.bits, ...newBits],
      };
    }
    case "HIGHLIGHT_DATA": {
    }
  }
}
