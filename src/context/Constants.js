

export const MODE = {
  Terminator: {
    name: "terminator",
    bits: 0x0,
  },
  Numeric: {
    name: "numeric",
    bits: 0x1,
    thresholds: [
      { max: 10, length: 10 },
      { max: 1000, length: 12 },
      { max: Infinity, length: 14 },
    ],
  },
  Alphanumeric: {
    name: "alphanumeric",
    bits: 0x2,
    thresholds: [
      { max: 45, length: 9 },
      { max: 1225, length: 11 },
      { max: Infinity, length: 13 },
    ],
  },
  StructuredAppend: {
    name: "StructuredAppend",
    bits: 0x3,
  },
  Byte: {
    name: "byte",
    bits: 0x4,
    thresholds: [
      { max: 256, length: 8 },
      { max: Infinity, length: 16 },
    ],
  },
  FNC1FirstPosition: {
    name: "FNC1FirstPosition",
    bits: 0x5,
  },
  ECI: {
    name: "eci",
    bits: 0x7,
  },
  Kanji: {
    name: "kanji",
    bits: 0x8,
  },
  FNC1SecondPosition: {
    name: "FNC1SecondPosition",
    bits: 0x9,
  },
};

export const PAD_BYTES = [
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