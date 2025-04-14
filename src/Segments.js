import { MODE, AlphaNumCharMap } from "./Constants";
import { BitUtils } from "./Utilities";

function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

class Segment {
  constructor(data, id, parentId) {
    this.data = data;
    this.id = id;
    this.inputId = parentId;
    this._bitsCache = null;
  }

  get bits() {
    if (!this._bitsCache) {
      const bitStr = BitUtils.toPaddedBinary(this._value, this.length);
      this._bitsCache = BitUtils.createTaggedBits(
        bitStr,
        "data",
        this.value,
        this.mode.name
      ).map((taggedBit) => {
        taggedBit.segmentId = this.id;
        return taggedBit;
      });
    }
    return this._bitsCache;
  }

  get value() {
    return this._value;
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.bits.length; i++) {
      yield this.bits[i];
    }
  }
}

export class NumericSegment extends Segment {
  constructor(data, index, parentId) {
    super(data, index, parentId);
    this.mode = MODE.Numeric;
    validateLength(data, 1, 3, this.mode.name);
    this.encoding = this.mode;
    this._value = parseInt(this.data, 10);
    this.length = this._value.toString().length * 3 + 1;
  }

  toString() {
    return this.value.toString().padStart(this.data.length, "0");
  }
}

export class AlphanumericSegment extends Segment {
  constructor(data, index, parentId) {
    super(data, index, parentId);
    this.mode = MODE.Alphanumeric;
    validateLength(data, 1, 2, this.mode.name);
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
  constructor(data, index, parentId, encoding) {
    super(data & 0xff, index, parentId);
    this.mode = MODE.Byte;
    this.encoding = encoding || "latin-1";
    this._value = this.data;
    this.length = 8;
  }

  toString() {
    if (this.encoding === "hex") return `0x${this.value.toString(16)}`;

    return String.fromCharCode(this.value);
  }
}
