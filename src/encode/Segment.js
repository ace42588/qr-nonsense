import { TaggedBit } from "./TaggedBit";

const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

class Segment {
  constructor(data, index) {
    this.data = data;
    this.index = index;
  }

  getEncodedBits() {
    return Array.from(this.bitString).map(
      (bit, idx) =>
        new TaggedBit({
          bit,
          type: "data",
          source: this,
          idx,
        })
    );
  }

  get bitString() {
    return this._value.toString(2).padStart(this.length, "0");
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
    if (data.length > 3 || data.length < 1) {
      throw new Error("NumericSegment must have 1-3 numeric characters!");
    }
    super(data, index);
    this.encoding = "numeric";
    this._value = parseInt(this.data, 10);
    this.length = this._value.toString().length * 3 + 1;
    this.bits = this.getEncodedBits();
  }

  toString() {
    return this.value.toString().padStart(this.data.length, '0');
  }
}

export class AlphanumericSegment extends Segment {
  constructor(data, index) {
    if (data.length > 3 || data.length < 1) {
      throw new Error(
        `AlphanumericSegment must have 1-2 characters from the class [${AlphaNumCharMap}]!`
      );
    }
    super(data, index);
    this.encoding = "alphaNumeric";
    if (data.length === 1) {
      this._value = AlphaNumCharMap.indexOf(data[0]);
      this.length = 6;
    } else if (data.length === 2) {
      this._value =
        AlphaNumCharMap.indexOf(data[0]) * 45 +
        AlphaNumCharMap.indexOf(data[1]);
      this.length = 11;
    }
    this.bits = this.getEncodedBits();
    //console.log("AlphanumericSegment", this);
  }

  toString() {
    let text;
    //console.log("AlphanumericSegment", "toString()", this.value);
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
    this.encoding = encoding ? encoding : "latin-1";
    this._value = this.data;
    this.length = 8;
    this.bits = this.getEncodedBits();
    //console.log(this);
  }

  toString() {
    console.log("Segment.toString()", this.value.toString(16));
    //return String.fromCharCode(this.value);
    return `0x${this.value.toString(16)}`;
  }
}
