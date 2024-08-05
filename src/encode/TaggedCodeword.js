import { ECBit } from "./TaggedBit";

export class TaggedCodeword {
  constructor(taggedBits, id) {
    this.id = id;
    this.bits = [];
    for (let i = 0; i < 8; i++) {
      const bit = taggedBits.pop();
      bit.codeword = this;
      this.bits.unshift(bit);
    }
  }

  get byte() {
    return this.bits.reduce((byte, taggedBit) => {
      return (byte << 1) | taggedBit.value;
    }, 0);
  }
}

export class ECCodeword extends TaggedCodeword {
  constructor(byte, id) {
    super(
      Array.from({ length: 8 }).map(
        (_, idx) => new ECBit({ bit: (byte >> 7-idx) & 1 })
      ),
      id
    );
  }
}
