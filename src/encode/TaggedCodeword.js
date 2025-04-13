import { ECBit } from "./TaggedBit";

export class TaggedCodeword {
  constructor(taggedBits, codewordId, blockId) {
    this.id = `${blockId}-${codewordId}`;
    this.bits = taggedBits.map((taggedBit) => {
      taggedBit.codeword = this.id;
      return taggedBit;
    })
    this.byte = this.bits.reduce((byte, taggedBit) => {
      return (byte << 1) | taggedBit.value;
    }, 0);
  }
}

export class ECCodeword extends TaggedCodeword {
  constructor(byte, codewordId, blockId) {
    super(
      Array.from({ length: 8 }).map(
        (_, idx) => new ECBit({ bit: (byte >> 7-idx) & 1 })
      ),
      codewordId,
      blockId
    );
  }
}
