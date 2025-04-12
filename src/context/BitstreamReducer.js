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
  Numeric: "numeric",
  Alphanumeric: "alphanumeric",
  Byte: "byte",
  Kanji: "kanji",
  ECI: "eci",
  Terminator: "terminator",
};

const ModeByte = {
  terminator: 0x0,
  numeric: 0x1,
  alphanumeric: 0x2,
  byte: 0x4,
  kanji: 0x8,
  eci: 0x7,
  //StructuredAppend: 0x3,
  //FNC1FirstPosition: 0x5,
  //FNC1SecondPosition: 0x9,
};

const AlphaNumCharClass = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

class Encoder {
  constructor() {}

  getCharCountIndicator(charCount) {
    throw new Error(
      "getCharCountIndicator() must be implemented in subclasses"
    );
  }

  encodeData(input, encoding) {
    throw new Error("encodeData() must be implemented in subclasses");
  }

  addModeIndicator() {
    const modeBits = ModeByte[this.mode].toString(2).padStart(4, "0");
    return [...modeBits].map(
      (bit) =>
        new TaggedBit({
          bit,
          type: "mode",
          source: this.mode,
          encoding: "none",
        })
    );
  }

  addCharacterCountIndicator(charCount) {
    const charCountBits = this.getCharCountIndicator(charCount);
    return [...charCountBits].map(
      (bit) =>
        new TaggedBit({
          bit,
          type: "characterCount",
          source: charCount,
          encoding: "none",
        })
    );
  }

  encode(data, encoding) {
    let bits = [];
    bits = [...this.addModeIndicator()];
    bits = [...bits, ...this.addCharacterCountIndicator(data.length)];

    let segments = [...this.encodeData(data, encoding)];
    bits = [...bits, segments.flatMap((s) => [...s])];

    return { segments, bits };
  }
}

class NumericEncoder extends Encoder {
  constructor(bitStream) {
    super({ bitStream });
    this.mode = MODE.Numeric;
  }

  getCharCountIndicator(charCount) {
    let indicatorLength = charCount < 10 ? 10 : charCount < 1000 ? 12 : 14;
    return charCount.toString(2).padStart(indicatorLength, "0");
  }

  *encodeData(input) {
    const groupsOfThree = input.match(/\d{1,3}/g);
    for (let i = 0; i < groupsOfThree.length; i++) {
      yield new NumericSegment(groupsOfThree[i], i);
    }
  }
}

class AlphanumericEncoder extends Encoder {
  constructor(bitStream) {
    super({ bitStream });
    this.mode = MODE.Alphanumeric;
  }

  getCharCountIndicator(charCount) {
    let indicatorLength = charCount < 45 ? 9 : charCount < 1225 ? 11 : 13;
    return charCount.toString(2).padStart(indicatorLength, "0");
  }

  *encodeData(input) {
    const matchRegEx = new RegExp(`[${AlphaNumCharClass}]{1,2}`, "g");
    const pairs = input.match(matchRegEx);

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

  getCharCountIndicator(charCount) {
    let indicatorLength = charCount < 256 ? 8 : 16;
    return charCount.toString(2).padStart(indicatorLength, "0");
  }

  *encodeData(input, encoding) {
    // TODO: optionally convert to UTF-8
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
  constructor() {
    super();
    this.mode = MODE.ECI;
  }

  encode(input) {
    let bits = [];
    bits = [...this.addModeIndicator()];
    const str = input.toString(2).padStart(input < 256 ? 8 : 16, "0");
    const taggedBits = [...str].map(
      (bit) =>
        new TaggedBit({
          bit,
          type: "assignmentNumber",
          source: input,
          encoding: "none",
        })
    );
    return [...bits, ...taggedBits];
  }
}

function getEncoder({ bitStream, type }) {
  //console.log("getEncoder", { bitStream, type });
  switch (type) {
    case "eci":
      return new EciEncoder();
    case "numeric":
      return new NumericEncoder();
    case "alphanumeric":
      return new AlphanumericEncoder();
    case "byte":
      return new ByteEncoder();
    case "kanji":
      throw new Error("Type not implemented");
    default:
      throw new Error("Invalid chunk type");
  }
}

function getFinalizedBits(versionNum, errorCorrectionLevel) {
    //console.log("getFinalizedBits")
    const { errorCorrectionLevels } = VERSIONS[versionNum - 1];
    const { ecCodewordsPerBlock, ecBlocks } =
      errorCorrectionLevels[errorCorrectionLevel];
    let requiredDataCodewords = 0;

    ecBlocks.forEach((group) => {
      const { numBlocks, dataCodewordsPerBlock } = group;
      requiredDataCodewords += numBlocks * dataCodewordsPerBlock;
    });
    const requiredBits = requiredDataCodewords * 8;
    let finalBits = Array.from(this.dataBits);
    //this.addTerminator(requiredBits);
    const diff = requiredBits - finalBits.length;
    let bits;
    if (diff >= 4) {
      bits = "0000";
    } else if (diff > 0) {
      bits = "".padStart(diff, "0");
    }
    const termBits = Array.from(bits).map((bit) => new TaggedBit({
        bit,
        type: "terminator",
        source: "terminator",
      })
    );
    finalBits = [...finalBits, ...termBits];
    //this.fillLastByte();
    const bitsNeeded = 8 - (finalBits.length % 8);
    if (bitsNeeded > 0 && bitsNeeded < 8) {
      bits = "".padStart(bitsNeeded, "0");
      const fillBits = Array.from(bits).map((bit) => new TaggedBit({
        bit,
        type: "terminator",
        source: "terminator",
      }));
      finalBits = [...finalBits, ...fillBits];
    }
    //this.addPadBytes(requiredDataCodewords);
    const currentBytes = finalBits.length / 8;
    //console.log("addPadBytes", { currentBytes });
    const bytesNeeded = requiredDataCodewords - currentBytes;
    //console.log("addPadBytes", { bytesNeeded });
    for (let i = 0; i < bytesNeeded; i++) {
      const taggedBits = PAD_BYTES[i % 2];
      finalBits = [...finalBits, ...taggedBits];
    }

    return finalBits;
  }

export default function BitstreamReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const { segments: newSegments, bits: newBits } = getEncoder(mode).encode(
        data,
        encoding
      );
      return {
        segments: [...state.segments, ...newSegments],
        bits: [...state.bits, ...newBits],
      };
    }
    case "HIGHLIGHT_DATA": {
      
    }
  }
}
