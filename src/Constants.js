export const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

export const CodewordLength = 8;

export const Actions = {
  ChangeInput: "UPDATE_INPUTS",
  ChangeDataMask: "UPDATE_DATAMASK",
  UpdateDataMask: "SET_DATAMASK",
  ChangeVersion: "UPDATE_VERSION",
  ChangeErrorCorretionLevel: "UPDATE_ECL",
};

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

export const ALIGNMENT_PATTERN = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

export const FINDER_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

export const FORMAT_INFO_TABLE = [
  { bits: 0x5412, formatInfo: { errorCorrectionLevel: 1, dataMask: 0 } },
  { bits: 0x5125, formatInfo: { errorCorrectionLevel: 1, dataMask: 1 } },
  { bits: 0x5e7c, formatInfo: { errorCorrectionLevel: 1, dataMask: 2 } },
  { bits: 0x5b4b, formatInfo: { errorCorrectionLevel: 1, dataMask: 3 } },
  { bits: 0x45f9, formatInfo: { errorCorrectionLevel: 1, dataMask: 4 } },
  { bits: 0x40ce, formatInfo: { errorCorrectionLevel: 1, dataMask: 5 } },
  { bits: 0x4f97, formatInfo: { errorCorrectionLevel: 1, dataMask: 6 } },
  { bits: 0x4aa0, formatInfo: { errorCorrectionLevel: 1, dataMask: 7 } },
  { bits: 0x77c4, formatInfo: { errorCorrectionLevel: 0, dataMask: 0 } },
  { bits: 0x72f3, formatInfo: { errorCorrectionLevel: 0, dataMask: 1 } },
  { bits: 0x7daa, formatInfo: { errorCorrectionLevel: 0, dataMask: 2 } },
  { bits: 0x789d, formatInfo: { errorCorrectionLevel: 0, dataMask: 3 } },
  { bits: 0x662f, formatInfo: { errorCorrectionLevel: 0, dataMask: 4 } },
  { bits: 0x6318, formatInfo: { errorCorrectionLevel: 0, dataMask: 5 } },
  { bits: 0x6c41, formatInfo: { errorCorrectionLevel: 0, dataMask: 6 } },
  { bits: 0x6976, formatInfo: { errorCorrectionLevel: 0, dataMask: 7 } },
  { bits: 0x1689, formatInfo: { errorCorrectionLevel: 3, dataMask: 0 } },
  { bits: 0x13be, formatInfo: { errorCorrectionLevel: 3, dataMask: 1 } },
  { bits: 0x1ce7, formatInfo: { errorCorrectionLevel: 3, dataMask: 2 } },
  { bits: 0x19d0, formatInfo: { errorCorrectionLevel: 3, dataMask: 3 } },
  { bits: 0x0762, formatInfo: { errorCorrectionLevel: 3, dataMask: 4 } },
  { bits: 0x0255, formatInfo: { errorCorrectionLevel: 3, dataMask: 5 } },
  { bits: 0x0d0c, formatInfo: { errorCorrectionLevel: 3, dataMask: 6 } },
  { bits: 0x083b, formatInfo: { errorCorrectionLevel: 3, dataMask: 7 } },
  { bits: 0x355f, formatInfo: { errorCorrectionLevel: 2, dataMask: 0 } },
  { bits: 0x3068, formatInfo: { errorCorrectionLevel: 2, dataMask: 1 } },
  { bits: 0x3f31, formatInfo: { errorCorrectionLevel: 2, dataMask: 2 } },
  { bits: 0x3a06, formatInfo: { errorCorrectionLevel: 2, dataMask: 3 } },
  { bits: 0x24b4, formatInfo: { errorCorrectionLevel: 2, dataMask: 4 } },
  { bits: 0x2183, formatInfo: { errorCorrectionLevel: 2, dataMask: 5 } },
  { bits: 0x2eda, formatInfo: { errorCorrectionLevel: 2, dataMask: 6 } },
  { bits: 0x2bed, formatInfo: { errorCorrectionLevel: 2, dataMask: 7 } },
];

export const DATA_MASKS = [
  (p) => (p.y + p.x) % 2 === 0,
  (p) => p.y % 2 === 0,
  (p) => p.x % 3 === 0,
  (p) => (p.y + p.x) % 3 === 0,
  (p) => (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0,
  (p) => ((p.x * p.y) % 2) + ((p.x * p.y) % 3) === 0,
  (p) => (((p.y * p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
  (p) => (((p.y + p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
];

export const PAD_BYTES = [236, 17];

export const VERSION_INFO = {
  1: {
    infoBits: null,
    alignmentPatternCenters: [],
  },
  2: {
    infoBits: null,
    alignmentPatternCenters: [6, 18],
  },
  3: {
    infoBits: null,
    alignmentPatternCenters: [6, 22],
  },
  4: {
    infoBits: null,
    alignmentPatternCenters: [6, 26],
  },
  5: {
    infoBits: null,
    alignmentPatternCenters: [6, 30],
  },
  6: {
    infoBits: null,
    alignmentPatternCenters: [6, 34],
  },
  7: {
    infoBits: 31892,
    alignmentPatternCenters: [6, 22, 38],
  },
  8: {
    infoBits: 34236,
    alignmentPatternCenters: [6, 24, 42],
  },
  9: {
    infoBits: 39577,
    alignmentPatternCenters: [6, 26, 46],
  },
  10: {
    infoBits: 42195,
    alignmentPatternCenters: [6, 28, 50],
  },
  11: {
    infoBits: 48118,
    alignmentPatternCenters: [6, 30, 54],
  },
  12: {
    infoBits: 51042,
    alignmentPatternCenters: [6, 32, 58],
  },
  13: {
    infoBits: 55367,
    alignmentPatternCenters: [6, 34, 62],
  },
  14: {
    infoBits: 58893,
    alignmentPatternCenters: [6, 26, 46, 66],
  },
  15: {
    infoBits: 63784,
    alignmentPatternCenters: [6, 26, 48, 70],
  },
  16: {
    infoBits: 68472,
    alignmentPatternCenters: [6, 26, 50, 74],
  },
  17: {
    infoBits: 70749,
    alignmentPatternCenters: [6, 30, 54, 78],
  },
  18: {
    infoBits: 76311,
    alignmentPatternCenters: [6, 30, 56, 82],
  },
  19: {
    infoBits: 79154,
    alignmentPatternCenters: [6, 30, 58, 86],
  },
  20: {
    infoBits: 84390,
    alignmentPatternCenters: [6, 34, 62, 90],
  },
  21: {
    infoBits: 87683,
    alignmentPatternCenters: [6, 28, 50, 72, 94],
  },
  22: {
    infoBits: 92361,
    alignmentPatternCenters: [6, 26, 50, 74, 98],
  },
  23: {
    infoBits: 96236,
    alignmentPatternCenters: [6, 30, 54, 74, 102],
  },
  24: {
    infoBits: 102084,
    alignmentPatternCenters: [6, 28, 54, 80, 106],
  },
  25: {
    infoBits: 102881,
    alignmentPatternCenters: [6, 32, 58, 84, 110],
  },
  26: {
    infoBits: 110507,
    alignmentPatternCenters: [6, 30, 58, 86, 114],
  },
  27: {
    infoBits: 110734,
    alignmentPatternCenters: [6, 34, 62, 90, 118],
  },
  28: {
    infoBits: 117786,
    alignmentPatternCenters: [6, 26, 50, 74, 98, 122],
  },
  29: {
    infoBits: 119615,
    alignmentPatternCenters: [6, 30, 54, 78, 102, 126],
  },
  30: {
    infoBits: 126325,
    alignmentPatternCenters: [6, 26, 52, 78, 104, 130],
  },
  31: {
    infoBits: 127568,
    alignmentPatternCenters: [6, 30, 56, 82, 108, 134],
  },
  32: {
    infoBits: 133589,
    alignmentPatternCenters: [6, 34, 60, 86, 112, 138],
  },
  33: {
    infoBits: 136944,
    alignmentPatternCenters: [6, 30, 58, 86, 114, 142],
  },
  34: {
    infoBits: 141498,
    alignmentPatternCenters: [6, 34, 62, 90, 118, 146],
  },
  35: {
    infoBits: 145311,
    alignmentPatternCenters: [6, 30, 54, 78, 102, 126, 150],
  },
  36: {
    infoBits: 150283,
    alignmentPatternCenters: [6, 24, 50, 76, 102, 128, 154],
  },
  37: {
    infoBits: 152622,
    alignmentPatternCenters: [6, 28, 54, 80, 106, 132, 158],
  },
  38: {
    infoBits: 158308,
    alignmentPatternCenters: [6, 32, 58, 84, 110, 136, 162],
  },
  39: {
    infoBits: 161089,
    alignmentPatternCenters: [6, 26, 54, 82, 110, 138, 166],
  },
  40: {
    infoBits: 167017,
    alignmentPatternCenters: [6, 30, 58, 86, 114, 142, 170],
  },
};

export const EC_INFO = {
  0: {
    1: {
      ecCodewordsPerBlock: 7,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 19,
        },
      ],
      capacity: 17,
    },
    2: {
      ecCodewordsPerBlock: 10,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 34,
        },
      ],
      capacity: 32,
    },
    3: {
      ecCodewordsPerBlock: 15,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 55,
        },
      ],
      capacity: 53,
    },
    4: {
      ecCodewordsPerBlock: 20,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 80,
        },
      ],
      capacity: 78,
    },
    5: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 108,
        },
      ],
      capacity: 106,
    },
    6: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 68,
        },
      ],
      capacity: 134,
    },
    7: {
      ecCodewordsPerBlock: 20,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 78,
        },
      ],
      capacity: 154,
    },
    8: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 97,
        },
      ],
      capacity: 192,
    },
    9: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 230,
    },
    10: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 68,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 69,
        },
      ],
      capacity: 271,
    },
    11: {
      ecCodewordsPerBlock: 20,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 81,
        },
      ],
      capacity: 321,
    },
    12: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 92,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 93,
        },
      ],
      capacity: 367,
    },
    13: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 107,
        },
      ],
      capacity: 425,
    },
    14: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 115,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 458,
    },
    15: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 87,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 88,
        },
      ],
      capacity: 520,
    },
    16: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 98,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 99,
        },
      ],
      capacity: 586,
    },
    17: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 107,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 108,
        },
      ],
      capacity: 644,
    },
    18: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 120,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 121,
        },
      ],
      capacity: 718,
    },
    19: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 113,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 114,
        },
      ],
      capacity: 792,
    },
    20: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 107,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 108,
        },
      ],
      capacity: 858,
    },
    21: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 116,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 117,
        },
      ],
      capacity: 929,
    },
    22: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 111,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 112,
        },
      ],
      capacity: 1003,
    },
    23: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 121,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 122,
        },
      ],
      capacity: 1091,
    },
    24: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 117,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 118,
        },
      ],
      capacity: 1171,
    },
    25: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 106,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 107,
        },
      ],
      capacity: 1273,
    },
    26: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 114,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 115,
        },
      ],
      capacity: 1367,
    },
    27: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 122,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 123,
        },
      ],
      capacity: 1465,
    },
    28: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 117,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 118,
        },
      ],
      capacity: 1528,
    },
    29: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 116,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 117,
        },
      ],
      capacity: 1628,
    },
    30: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 115,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 1732,
    },
    31: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 115,
        },
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 1840,
    },
    32: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 115,
        },
      ],
      capacity: 1952,
    },
    33: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 115,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 2068,
    },
    34: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 115,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 116,
        },
      ],
      capacity: 2188,
    },
    35: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 12,
          dataCodewordsPerBlock: 121,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 122,
        },
      ],
      capacity: 2303,
    },
    36: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 121,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 122,
        },
      ],
      capacity: 2431,
    },
    37: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 122,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 123,
        },
      ],
      capacity: 2563,
    },
    38: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 122,
        },
        {
          numBlocks: 18,
          dataCodewordsPerBlock: 123,
        },
      ],
      capacity: 2699,
    },
    39: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 20,
          dataCodewordsPerBlock: 117,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 118,
        },
      ],
      capacity: 2809,
    },
    40: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 118,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 119,
        },
      ],
      capacity: 2953,
    },
  },
  1: {
    1: {
      ecCodewordsPerBlock: 10,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 14,
    },
    2: {
      ecCodewordsPerBlock: 16,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 28,
        },
      ],
      capacity: 26,
    },
    3: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 44,
        },
      ],
      capacity: 42,
    },
    4: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 32,
        },
      ],
      capacity: 62,
    },
    5: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 43,
        },
      ],
      capacity: 84,
    },
    6: {
      ecCodewordsPerBlock: 16,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 27,
        },
      ],
      capacity: 106,
    },
    7: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 31,
        },
      ],
      capacity: 122,
    },
    8: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 38,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 39,
        },
      ],
      capacity: 152,
    },
    9: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 36,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 37,
        },
      ],
      capacity: 180,
    },
    10: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 43,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 44,
        },
      ],
      capacity: 213,
    },
    11: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 50,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 51,
        },
      ],
      capacity: 251,
    },
    12: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 36,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 37,
        },
      ],
      capacity: 287,
    },
    13: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 37,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 38,
        },
      ],
      capacity: 331,
    },
    14: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 40,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 41,
        },
      ],
      capacity: 362,
    },
    15: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 41,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 42,
        },
      ],
      capacity: 412,
    },
    16: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 45,
        },
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 450,
    },
    17: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 504,
    },
    18: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 9,
          dataCodewordsPerBlock: 43,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 44,
        },
      ],
      capacity: 560,
    },
    19: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 44,
        },
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 45,
        },
      ],
      capacity: 624,
    },
    20: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 41,
        },
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 42,
        },
      ],
      capacity: 666,
    },
    21: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 42,
        },
      ],
      capacity: 711,
    },
    22: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 779,
    },
    23: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 857,
    },
    24: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 45,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 911,
    },
    25: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 997,
    },
    26: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1059,
    },
    27: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 22,
          dataCodewordsPerBlock: 45,
        },
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 1125,
    },
    28: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 45,
        },
        {
          numBlocks: 23,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 1190,
    },
    29: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 21,
          dataCodewordsPerBlock: 45,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 46,
        },
      ],
      capacity: 1264,
    },
    30: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 1370,
    },
    31: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 29,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1452,
    },
    32: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 23,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1538,
    },
    33: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 21,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1628,
    },
    34: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 23,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1722,
    },
    35: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 12,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 26,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 1809,
    },
    36: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 34,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 1911,
    },
    37: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 29,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 1989,
    },
    38: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 46,
        },
        {
          numBlocks: 32,
          dataCodewordsPerBlock: 47,
        },
      ],
      capacity: 2099,
    },
    39: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 40,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 2213,
    },
    40: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 18,
          dataCodewordsPerBlock: 47,
        },
        {
          numBlocks: 31,
          dataCodewordsPerBlock: 48,
        },
      ],
      capacity: 2331,
    },
  },
  2: {
    1: {
      ecCodewordsPerBlock: 13,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 11,
    },
    2: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 22,
        },
      ],
      capacity: 20,
    },
    3: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 32,
    },
    4: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 24,
        },
      ],
      capacity: 46,
    },
    5: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 60,
    },
    6: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 19,
        },
      ],
      capacity: 74,
    },
    7: {
      ecCodewordsPerBlock: 18,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 14,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 86,
    },
    8: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 18,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 19,
        },
      ],
      capacity: 108,
    },
    9: {
      ecCodewordsPerBlock: 20,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 130,
    },
    10: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 19,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 20,
        },
      ],
      capacity: 151,
    },
    11: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 22,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 23,
        },
      ],
      capacity: 177,
    },
    12: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 20,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 21,
        },
      ],
      capacity: 203,
    },
    13: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 20,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 21,
        },
      ],
      capacity: 241,
    },
    14: {
      ecCodewordsPerBlock: 20,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 258,
    },
    15: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 292,
    },
    16: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 15,
          dataCodewordsPerBlock: 19,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 20,
        },
      ],
      capacity: 322,
    },
    17: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 22,
        },
        {
          numBlocks: 15,
          dataCodewordsPerBlock: 23,
        },
      ],
      capacity: 364,
    },
    18: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 22,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 23,
        },
      ],
      capacity: 394,
    },
    19: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 21,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 22,
        },
      ],
      capacity: 442,
    },
    20: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 15,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 482,
    },
    21: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 22,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 23,
        },
      ],
      capacity: 509,
    },
    22: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 16,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 565,
    },
    23: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 611,
    },
    24: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 16,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 661,
    },
    25: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 22,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 715,
    },
    26: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 28,
          dataCodewordsPerBlock: 22,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 23,
        },
      ],
      capacity: 751,
    },
    27: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 23,
        },
        {
          numBlocks: 26,
          dataCodewordsPerBlock: 24,
        },
      ],
      capacity: 805,
    },
    28: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 31,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 868,
    },
    29: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 23,
        },
        {
          numBlocks: 37,
          dataCodewordsPerBlock: 24,
        },
      ],
      capacity: 908,
    },
    30: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 15,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 25,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 982,
    },
    31: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 42,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1030,
    },
    32: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 35,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1112,
    },
    33: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 29,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1168,
    },
    34: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 44,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1228,
    },
    35: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 39,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1283,
    },
    36: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 46,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1351,
    },
    37: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 49,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1423,
    },
    38: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 48,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1499,
    },
    39: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 43,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 22,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1579,
    },
    40: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 34,
          dataCodewordsPerBlock: 24,
        },
        {
          numBlocks: 34,
          dataCodewordsPerBlock: 25,
        },
      ],
      capacity: 1663,
    },
  },
  3: {
    1: {
      ecCodewordsPerBlock: 17,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 9,
        },
      ],
      capacity: 7,
    },
    2: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 14,
    },
    3: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 24,
    },
    4: {
      ecCodewordsPerBlock: 16,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 9,
        },
      ],
      capacity: 34,
    },
    5: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 11,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 12,
        },
      ],
      capacity: 44,
    },
    6: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 58,
    },
    7: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 13,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 14,
        },
      ],
      capacity: 64,
    },
    8: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 14,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 84,
    },
    9: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 12,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 98,
    },
    10: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 119,
    },
    11: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 12,
        },
        {
          numBlocks: 8,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 137,
    },
    12: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 14,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 155,
    },
    13: {
      ecCodewordsPerBlock: 22,
      ecBlocks: [
        {
          numBlocks: 12,
          dataCodewordsPerBlock: 11,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 12,
        },
      ],
      capacity: 177,
    },
    14: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 12,
        },
        {
          numBlocks: 5,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 194,
    },
    15: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 12,
        },
        {
          numBlocks: 7,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 220,
    },
    16: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 3,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 250,
    },
    17: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 14,
        },
        {
          numBlocks: 17,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 280,
    },
    18: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 14,
        },
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 15,
        },
      ],
      capacity: 310,
    },
    19: {
      ecCodewordsPerBlock: 26,
      ecBlocks: [
        {
          numBlocks: 9,
          dataCodewordsPerBlock: 13,
        },
        {
          numBlocks: 16,
          dataCodewordsPerBlock: 14,
        },
      ],
      capacity: 338,
    },
    20: {
      ecCodewordsPerBlock: 28,
      ecBlocks: [
        {
          numBlocks: 15,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 382,
    },
    21: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 6,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 403,
    },
    22: {
      ecCodewordsPerBlock: 24,
      ecBlocks: [
        {
          numBlocks: 34,
          dataCodewordsPerBlock: 13,
        },
      ],
      capacity: 439,
    },
    23: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 16,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 14,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 461,
    },
    24: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 30,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 511,
    },
    25: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 22,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 13,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 535,
    },
    26: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 33,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 4,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 593,
    },
    27: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 12,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 28,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 625,
    },
    28: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 31,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 658,
    },
    29: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 26,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 698,
    },
    30: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 23,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 25,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 742,
    },
    31: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 23,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 28,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 790,
    },
    32: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 19,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 35,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 842,
    },
    33: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 11,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 46,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 898,
    },
    34: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 59,
          dataCodewordsPerBlock: 16,
        },
        {
          numBlocks: 1,
          dataCodewordsPerBlock: 17,
        },
      ],
      capacity: 958,
    },
    35: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 22,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 41,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 983,
    },
    36: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 2,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 64,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 1051,
    },
    37: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 24,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 46,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 1093,
    },
    38: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 42,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 32,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 1139,
    },
    39: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 10,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 67,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 1219,
    },
    40: {
      ecCodewordsPerBlock: 30,
      ecBlocks: [
        {
          numBlocks: 20,
          dataCodewordsPerBlock: 15,
        },
        {
          numBlocks: 61,
          dataCodewordsPerBlock: 16,
        },
      ],
      capacity: 1273,
    },
  },
};

// Assign string aliases for error correction levels
EC_INFO["L"] = EC_INFO[0];
EC_INFO["M"] = EC_INFO[1];
EC_INFO["Q"] = EC_INFO[2];
EC_INFO["H"] = EC_INFO[3];
