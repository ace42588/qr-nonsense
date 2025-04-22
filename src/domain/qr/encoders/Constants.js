export const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

export const CodewordLength = 8;

export const PAD_BYTES = [236, 17];

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
    groupingRegex: /\d{1,3}/g
  },
  Alphanumeric: {
    name: "alphanumeric",
    bits: 0x2,
    thresholds: [
      { max: 45, length: 9 },
      { max: 1225, length: 11 },
      { max: Infinity, length: 13 },
    ],
    groupingRegex: /[0-9A-Z \$\%\*\+\-\.\/\:]{1,2}/g
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
    thresholds: [
      { max: 256, length: 8 },
      { max: Infinity, length: 16 },
    ]
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
