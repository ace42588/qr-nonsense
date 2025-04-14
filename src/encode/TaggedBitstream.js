import { VERSIONS } from "./version";

export class TaggedBit {
  constructor({ bit, type, source, idx }) {
    this.value = !!(bit == "1");
    this.orginalValue = this.value;
    this.type = type; // (e.g., 'mode', 'character indicator')
    this.source = source; // Source value (e.g., the character or byte that generated this bit)
    this.idx = idx;
    this.codeword = null;
    this.altered = false;
  }

  toggle() {
    this.altered = true;
    this.value = !this.value;

  }

  toString() {
    return this.value ? "1" : "0";
  }
}

export class ModeBit extends TaggedBit {
  constructor({ bit, mode }) {
    super({ bit, type: "modeIndicator", source: mode });
    this.encoding = "none";
  }
}

export class CharCountBit extends TaggedBit {
  constructor({ bit, charCount }) {
    super({
      bit,
      type: "characterCountIndicator",
      source: charCount,
    });
    this.encoding = "none";
  }
}

export class PatternBit extends TaggedBit {
  constructor({ bit, patternType }) {
    super({
      bit: bit ? "1" : "0",
      type: "pattern",
      source: patternType,
    });
    this.encoding = "none";
  }

  isDark() {
    return this.value;
  }
}

export class FormatBit extends TaggedBit {
  constructor({ bit, source, x, y }) {
    super({
      bit: bit ? "1" : "0",
      type: "formatInfo",
      source: source,
    });
    this.x = x;
    this.y = y;
    this.encoding = "BCH";
  }

  isDark() {
    return this.value;
  }
}

export class VersionBit extends TaggedBit {
  constructor({ bit }) {
    super({
      bit: bit ? "1" : "0",
      type: "versionInfo",
      source: "none",
    });
    this.encoding = "BCH";
  }

  isDark() {
    return this.value;
  }
}

export class ECBit extends TaggedBit {
  constructor({ bit }) {
    super({
      bit: bit,
      type: "errorCorrection",
      source: null,
    });
    this.encoding = "reed-solomon";
  }
}

export class RemainderBit extends TaggedBit {
  constructor() {
    super({
      bit: "0",
      type: "remainder",
      source: null,
    });
    this.encoding = "none";
  }
}

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

export class TaggedBitstream {
  constructor() {
    this.dataBits = [];
    this.segments = [];
    this.readIdx = 0;
    this.finalized = false;
  }

  addBits(numBits, bits, type, source, encoding) {
    let bitStr;
    let bitArr;

    if (Array.isArray(bits)) {
      bitArr = bits;
    } else if (typeof bits === "number") {
      bitStr = bits.toString(2);
    } else if (typeof bits === "string") {
      const regex = new RegExp("^[01]{1,}$");
      if (regex.test(bits)) {
        bitStr = bits;
      }
    }

    numBits = numBits ? numBits : bitStr.length;

    if (numBits > bitStr.length) {
      bitStr.padStart(numBits, "0");
    } else if (numBits < bitStr) {
      bitStr = bitStr.substring(bitStr.length - numBits);
    }

    bitArr = bitStr ? Array.from(bitStr) : bitArr;

    for (const bit of bitArr) {
      const taggedBit = new TaggedBit({ bit, type, source, encoding });
      this.dataBits.push(taggedBit);
    }
  }

  addPadBytes(requiredBytes) {
    const currentBytes = this.dataBits.length / 8;
    console.log("addPadBytes", { currentBytes });
    const bytesNeeded = requiredBytes - currentBytes;
    console.log("addPadBytes", { bytesNeeded });
    for (let i = 0; i < bytesNeeded; i++) {
      const taggedBits = PAD_BYTES[i % 2];
      //console.log("addPadBytes", { taggedBits });
      this.dataBits = [...this.dataBits, ...taggedBits];
    }
    //console.log("addPadBytes", this.dataBits.slice(-16));
  }

  addTerminator(requiredBits) {
    const diff = requiredBits - this.dataBits.length;
    if (diff >= 4) {
      this.addBits(4, "0000", "terminator", "terminator");
      //console.log("addTerminator", this.dataBits.slice(-8));
    } else if (diff > 0) {
      const termBits = "".padStart(diff, "0");
      this.addBits(termBits.length, termBits, "terminator", "terminator");
      //console.log("addTerminator", this.dataBits.slice(-8));
    }
  }

  addSegment(segment, type, encoding) {
    //console.log("addSegment", segment);
    this.segments.push(segment);
    for (const bit of segment) {
      //console.log(bit);
      this.dataBits.push(bit);
    }
  }

  available() {
    return this.dataBits.length - this.readIdx;
  }

  size() {
    return this.dataBits.length;
  }

  fillLastByte() {
    const bitsNeeded = 8 - (this.dataBits.length % 8);
    if (bitsNeeded > 0 && bitsNeeded < 8) {
      const bits = "".padStart(bitsNeeded, "0");
      this.addBits(bits.length, bits, "none", "none");
    }
    //console.log("fillLastByte", this.dataBits.slice(-8));
  }

  finalize(requiredBytes) {
    //console.log("finalize", this.segments);
    if (this.finalized) return;
    const requiredBits = requiredBytes * 8;
    this.addTerminator(requiredBits);
    this.fillLastByte();
    this.addPadBytes(requiredBytes);
    this.finalized = true;
  }

  getFinalizedBits(versionNum, errorCorrectionLevel) {
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

  readTaggedByte() {
    if (!this.finalized) {
      throw new Error("Attempted read before finalizing");
    }
    if (this.available() < 8) {
      throw new Error(
        `Tried to read 8 bits, but only ${this.available()} remaining`
      );
    }

    const start = this.readIdx;
    this.readIdx += 8;

    return this.dataBits.slice(start, this.readIdx);
  }

  resetReadPosition() {
    console.log("resetReadPosition");
    this.readIdx = 0;
  }
}
