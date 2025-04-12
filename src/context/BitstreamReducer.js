import { NumericSegment, AlphanumericSegment, ByteSegment } from "../encode/Segment";

const Mode = {
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
  constructor({ bitStream }) {
    this.bitStream = bitStream;
  }

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
    this.bitStream.addBits(null, modeBits, "mode", this.mode, "none");
  }

  addCharacterCountIndicator(charCount) {
    const charCountBits = this.getCharCountIndicator(charCount);
    this.bitStream.addBits(
      null,
      charCountBits,
      "characterCount",
      charCount,
      "none"
    );
  }

  encode(data, encoding) {
    let bits = [];
    bits = [...this.addModeIndicator()];
    bits = [...bits, ...this.addCharacterCountIndicator(data.length)];
    
    let segments = [...this.encodeData(data, encoding)];

    for (const encoded of this.encodeData(data, encoding)) {
      segments = [...segments, encoded];
      for (const bit of encoded) {
        this.dataBits.push(bit);
      }
      this.bitStream.addSegment(encoded);
    }
  }
}

class NumericEncoder extends Encoder {
  constructor(bitStream) {
    super({ bitStream });
    this.mode = Mode.Numeric;
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
    this.mode = Mode.Alphanumeric;
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
  constructor(bitStream) {
    super({ bitStream });
    this.mode = Mode.Byte;
  }

  getCharCountIndicator(charCount) {
    let indicatorLength = charCount < 256 ? 8 : 16;
    return charCount.toString(2).padStart(indicatorLength, "0");
  }

  *encodeData(input, encoding) {
    // TODO: optionally convert to UTF-8
    if (encoding === "hex") {
      for (let i = 0; i < input.length; i += 2) {
        const byte = parseInt(input.substring(i, i+2), 16);
        yield new ByteSegment(byte, i/2, encoding);
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
  constructor(bitStream) {
    super({ bitStream });
    this.mode = Mode.ECI;
  }

  encode(input) {
    const bits = input.toString(2).padStart(input < 256 ? 8 : 16, "0");
    this.addModeIndicator();
    //addBits(numBits, bits, type, source, encoding)
    this.bitStream.addBits(null, bits, "assignmentNumber", input, "none");
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

export default function BitstreamReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      getEncoder(mode)
    }
  }
}