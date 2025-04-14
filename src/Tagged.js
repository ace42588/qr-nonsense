export class TaggedBit {
  constructor({ bit, type, source, id }) {
    this.value = !!(bit == "1");
    this.orginalValue = this.value;
    this.sourceType = type; // (e.g., 'mode', 'character indicator')
    this.sourceValue = source; // Source value (e.g., the character or byte that generated this bit)
    this.id = id;
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
    this.blockId = blockId;
    this.id = codewordId;
    this.bits = taggedBits.map((taggedBit) => {
      taggedBit.codewordId = this.id;
      return taggedBit;
    })
    this.byteValue = this.bits.reduce((byte, taggedBit) => {
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