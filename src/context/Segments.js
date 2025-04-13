import { BitUtils, MODE } from './utilities';

const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

class Segment {
  constructor(data, index) {
    this.data = data;
    this.index = index;
    this._bitsCache = null;
  }

  static validateLength(data, min, max, type) {
    if (data.length < min || data.length > max) {
      throw new Error(
        `${type} segment must have between ${min} and ${max} characters.`
      );
    }
  }

  get bits() {
    if (!this._bitsCache) {
      const bitStr = BitUtils.toPaddedBinary(this._value, this.length);
      this._bitsCache = BitUtils.createTaggedBits(
        bitStr,
        "data",
        this.value,
        this.mode.toString()
      );
    }
    return this._bitsCache;
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

export class NumericSegment extends Segment {
  constructor(data, index) {
    this.mode = MODE.Numeric;
    if (data.length > 3 || data.length < 1) {
      throw new Error("NumericSegment must have 1-3 numeric characters!");
    }
    super(data, index);
    this.encoding = this.mode;
    this._value = parseInt(this.data, 10);
    this.length = this._value.toString().length * 3 + 1;
  }

  toString() {
    return this.value.toString().padStart(this.data.length, "0");
  }
}

export class AlphanumericSegment extends Segment {
  constructor(data, index) {
    this.mode = MODE.Alphanumeric;
    if (data.length > 2 || data.length < 1) {
      throw new Error(
        `AlphanumericSegment must have 1-2 characters from the class [${AlphaNumCharMap}]!`
      );
    }
    super(data, index);
    this.encoding = this.mode.name;
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

export class ByteSegment extends Segment {
  constructor(data, index, encoding) {
    super(data & 0xff, index);
    this.mode = MODE.Byte;
    this.encoding = `byte-${encoding || "latin-1"}`;
    this._value = this.data;
    this.length = 8;
  }

  toString() {
    if (this.encoding === "hex") return `0x${this.value.toString(16)}`;

    return String.fromCharCode(this.value);
  }
}
