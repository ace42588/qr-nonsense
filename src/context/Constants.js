import { TaggedBit } from "../encode/TaggedBit";

export const AlphaNumCharMap = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

export const Actions = {
  ChangeInput: "ENCODE_DATA"
}

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

export const VERSION_BYTE_CAPS = [
    {
      1: 17,
      2: 32,
      3: 53,
      4: 78,
      5: 106,
      6: 134,
      7: 154,
      8: 192,
      9: 230,
      10: 271,
      11: 321,
      12: 367,
      13: 425,
      14: 458,
      15: 520,
      16: 586,
      17: 644,
      18: 718,
      19: 792,
      20: 858,
      21: 929,
      22: 1003,
      23: 1091,
      24: 1171,
      25: 1273,
      26: 1367,
      27: 1465,
      28: 1528,
      29: 1628,
      30: 1732,
      31: 1840,
      32: 1952,
      33: 2068,
      34: 2188,
      35: 2303,
      36: 2431,
      37: 2563,
      38: 2699,
      39: 2809,
      40: 2953,
    },
    {
      1: 14,
      2: 26,
      3: 42,
      4: 62,
      5: 84,
      6: 106,
      7: 122,
      8: 152,
      9: 180,
      10: 213,
      11: 251,
      12: 287,
      13: 331,
      14: 362,
      15: 412,
      16: 450,
      17: 504,
      18: 560,
      19: 624,
      20: 666,
      21: 711,
      22: 779,
      23: 857,
      24: 911,
      25: 997,
      26: 1059,
      27: 1125,
      28: 1190,
      29: 1264,
      30: 1370,
      31: 1452,
      32: 1538,
      33: 1628,
      34: 1722,
      35: 1809,
      36: 1911,
      37: 1989,
      38: 2099,
      39: 2213,
      40: 2331,
    },
    {
      1: 11,
      2: 20,
      3: 32,
      4: 46,
      5: 60,
      6: 74,
      7: 86,
      8: 108,
      9: 130,
      10: 151,
      11: 177,
      12: 203,
      13: 241,
      14: 258,
      15: 292,
      16: 322,
      17: 364,
      18: 394,
      19: 442,
      20: 482,
      21: 509,
      22: 565,
      23: 611,
      24: 661,
      25: 715,
      26: 751,
      27: 805,
      28: 868,
      29: 908,
      30: 982,
      31: 1030,
      32: 1112,
      33: 1168,
      34: 1228,
      35: 1283,
      36: 1351,
      37: 1423,
      38: 1499,
      39: 1579,
      40: 1663,
    },
    {
      1: 7,
      2: 14,
      3: 24,
      4: 34,
      5: 44,
      6: 58,
      7: 64,
      8: 84,
      9: 98,
      10: 119,
      11: 137,
      12: 155,
      13: 177,
      14: 194,
      15: 220,
      16: 250,
      17: 280,
      18: 310,
      19: 338,
      20: 382,
      21: 403,
      22: 439,
      23: 461,
      24: 511,
      25: 535,
      26: 593,
      27: 625,
      28: 658,
      29: 698,
      30: 742,
      31: 790,
      32: 842,
      33: 898,
      34: 958,
      35: 983,
      36: 1051,
      37: 1093,
      38: 1139,
      39: 1219,
      40: 1273,
    },
  ];


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

export const VERSIONS = [
  {
    infoBits: null,
    versionNumber: 1,
    alignmentPatternCenters: [],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 7,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 19 }],
      },
      {
        ecCodewordsPerBlock: 10,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }],
      },
      {
        ecCodewordsPerBlock: 13,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 13 }],
      },
      {
        ecCodewordsPerBlock: 17,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 9 }],
      },
    ],
  },
  {
    infoBits: null,
    versionNumber: 2,
    alignmentPatternCenters: [6, 18],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 10,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 34 }],
      },
      {
        ecCodewordsPerBlock: 16,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 28 }],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 22 }],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }],
      },
    ],
  },
  {
    infoBits: null,
    versionNumber: 3,
    alignmentPatternCenters: [6, 22],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 15,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 55 }],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 44 }],
      },
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 17 }],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 13 }],
      },
    ],
  },
  {
    infoBits: null,
    versionNumber: 4,
    alignmentPatternCenters: [6, 26],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 20,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 80 }],
      },
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 32 }],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 24 }],
      },
      {
        ecCodewordsPerBlock: 16,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 9 }],
      },
    ],
  },
  {
    infoBits: null,
    versionNumber: 5,
    alignmentPatternCenters: [6, 30],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 108 }],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 43 }],
      },
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 15 },
          { numBlocks: 2, dataCodewordsPerBlock: 16 },
        ],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 11 },
          { numBlocks: 2, dataCodewordsPerBlock: 12 },
        ],
      },
    ],
  },
  {
    infoBits: null,
    versionNumber: 6,
    alignmentPatternCenters: [6, 34],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 68 }],
      },
      {
        ecCodewordsPerBlock: 16,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 27 }],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 19 }],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 15 }],
      },
    ],
  },
  {
    infoBits: 0x07c94,
    versionNumber: 7,
    alignmentPatternCenters: [6, 22, 38],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 20,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 78 }],
      },
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 31 }],
      },
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 14 },
          { numBlocks: 4, dataCodewordsPerBlock: 15 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 13 },
          { numBlocks: 1, dataCodewordsPerBlock: 14 },
        ],
      },
    ],
  },
  {
    infoBits: 0x085bc,
    versionNumber: 8,
    alignmentPatternCenters: [6, 24, 42],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 97 }],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 38 },
          { numBlocks: 2, dataCodewordsPerBlock: 39 },
        ],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 18 },
          { numBlocks: 2, dataCodewordsPerBlock: 19 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 14 },
          { numBlocks: 2, dataCodewordsPerBlock: 15 },
        ],
      },
    ],
  },
  {
    infoBits: 0x09a99,
    versionNumber: 9,
    alignmentPatternCenters: [6, 26, 46],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 116 }],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 36 },
          { numBlocks: 2, dataCodewordsPerBlock: 37 },
        ],
      },
      {
        ecCodewordsPerBlock: 20,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 16 },
          { numBlocks: 4, dataCodewordsPerBlock: 17 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 12 },
          { numBlocks: 4, dataCodewordsPerBlock: 13 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0a4d3,
    versionNumber: 10,
    alignmentPatternCenters: [6, 28, 50],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 18,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 68 },
          { numBlocks: 2, dataCodewordsPerBlock: 69 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 43 },
          { numBlocks: 1, dataCodewordsPerBlock: 44 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 19 },
          { numBlocks: 2, dataCodewordsPerBlock: 20 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 15 },
          { numBlocks: 2, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0bbf6,
    versionNumber: 11,
    alignmentPatternCenters: [6, 30, 54],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 20,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 81 }],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 1, dataCodewordsPerBlock: 50 },
          { numBlocks: 4, dataCodewordsPerBlock: 51 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 22 },
          { numBlocks: 4, dataCodewordsPerBlock: 23 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 12 },
          { numBlocks: 8, dataCodewordsPerBlock: 13 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0c762,
    versionNumber: 12,
    alignmentPatternCenters: [6, 32, 58],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 92 },
          { numBlocks: 2, dataCodewordsPerBlock: 93 },
        ],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 36 },
          { numBlocks: 2, dataCodewordsPerBlock: 37 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 20 },
          { numBlocks: 6, dataCodewordsPerBlock: 21 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 7, dataCodewordsPerBlock: 14 },
          { numBlocks: 4, dataCodewordsPerBlock: 15 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0d847,
    versionNumber: 13,
    alignmentPatternCenters: [6, 34, 62],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 107 }],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 37 },
          { numBlocks: 1, dataCodewordsPerBlock: 38 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 20 },
          { numBlocks: 4, dataCodewordsPerBlock: 21 },
        ],
      },
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 12, dataCodewordsPerBlock: 11 },
          { numBlocks: 4, dataCodewordsPerBlock: 12 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0e60d,
    versionNumber: 14,
    alignmentPatternCenters: [6, 26, 46, 66],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 115 },
          { numBlocks: 1, dataCodewordsPerBlock: 116 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 40 },
          { numBlocks: 5, dataCodewordsPerBlock: 41 },
        ],
      },
      {
        ecCodewordsPerBlock: 20,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 16 },
          { numBlocks: 5, dataCodewordsPerBlock: 17 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 12 },
          { numBlocks: 5, dataCodewordsPerBlock: 13 },
        ],
      },
    ],
  },
  {
    infoBits: 0x0f928,
    versionNumber: 15,
    alignmentPatternCenters: [6, 26, 48, 70],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 22,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 87 },
          { numBlocks: 1, dataCodewordsPerBlock: 88 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 41 },
          { numBlocks: 5, dataCodewordsPerBlock: 42 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 24 },
          { numBlocks: 7, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 12 },
          { numBlocks: 7, dataCodewordsPerBlock: 13 },
        ],
      },
    ],
  },
  {
    infoBits: 0x10b78,
    versionNumber: 16,
    alignmentPatternCenters: [6, 26, 50, 74],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 98 },
          { numBlocks: 1, dataCodewordsPerBlock: 99 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 7, dataCodewordsPerBlock: 45 },
          { numBlocks: 3, dataCodewordsPerBlock: 46 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [
          { numBlocks: 15, dataCodewordsPerBlock: 19 },
          { numBlocks: 2, dataCodewordsPerBlock: 20 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 15 },
          { numBlocks: 13, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1145d,
    versionNumber: 17,
    alignmentPatternCenters: [6, 30, 54, 78],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 1, dataCodewordsPerBlock: 107 },
          { numBlocks: 5, dataCodewordsPerBlock: 108 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 10, dataCodewordsPerBlock: 46 },
          { numBlocks: 1, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 1, dataCodewordsPerBlock: 22 },
          { numBlocks: 15, dataCodewordsPerBlock: 23 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 14 },
          { numBlocks: 17, dataCodewordsPerBlock: 15 },
        ],
      },
    ],
  },
  {
    infoBits: 0x12a17,
    versionNumber: 18,
    alignmentPatternCenters: [6, 30, 56, 82],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 120 },
          { numBlocks: 1, dataCodewordsPerBlock: 121 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 9, dataCodewordsPerBlock: 43 },
          { numBlocks: 4, dataCodewordsPerBlock: 44 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 17, dataCodewordsPerBlock: 22 },
          { numBlocks: 1, dataCodewordsPerBlock: 23 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 14 },
          { numBlocks: 19, dataCodewordsPerBlock: 15 },
        ],
      },
    ],
  },
  {
    infoBits: 0x13532,
    versionNumber: 19,
    alignmentPatternCenters: [6, 30, 58, 86],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 113 },
          { numBlocks: 4, dataCodewordsPerBlock: 114 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 44 },
          { numBlocks: 11, dataCodewordsPerBlock: 45 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 17, dataCodewordsPerBlock: 21 },
          { numBlocks: 4, dataCodewordsPerBlock: 22 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 9, dataCodewordsPerBlock: 13 },
          { numBlocks: 16, dataCodewordsPerBlock: 14 },
        ],
      },
    ],
  },
  {
    infoBits: 0x149a6,
    versionNumber: 20,
    alignmentPatternCenters: [6, 34, 62, 90],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 107 },
          { numBlocks: 5, dataCodewordsPerBlock: 108 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 41 },
          { numBlocks: 13, dataCodewordsPerBlock: 42 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 15, dataCodewordsPerBlock: 24 },
          { numBlocks: 5, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 15, dataCodewordsPerBlock: 15 },
          { numBlocks: 10, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x15683,
    versionNumber: 21,
    alignmentPatternCenters: [6, 28, 50, 72, 94],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 116 },
          { numBlocks: 4, dataCodewordsPerBlock: 117 },
        ],
      },
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 42 }],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 17, dataCodewordsPerBlock: 22 },
          { numBlocks: 6, dataCodewordsPerBlock: 23 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 16 },
          { numBlocks: 6, dataCodewordsPerBlock: 17 },
        ],
      },
    ],
  },
  {
    infoBits: 0x168c9,
    versionNumber: 22,
    alignmentPatternCenters: [6, 26, 50, 74, 98],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 111 },
          { numBlocks: 7, dataCodewordsPerBlock: 112 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 46 }],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 7, dataCodewordsPerBlock: 24 },
          { numBlocks: 16, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 24,
        ecBlocks: [{ numBlocks: 34, dataCodewordsPerBlock: 13 }],
      },
    ],
  },
  {
    infoBits: 0x177ec,
    versionNumber: 23,
    alignmentPatternCenters: [6, 30, 54, 74, 102],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 121 },
          { numBlocks: 5, dataCodewordsPerBlock: 122 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 47 },
          { numBlocks: 14, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 24 },
          { numBlocks: 14, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 16, dataCodewordsPerBlock: 15 },
          { numBlocks: 14, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x18ec4,
    versionNumber: 24,
    alignmentPatternCenters: [6, 28, 54, 80, 106],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 117 },
          { numBlocks: 4, dataCodewordsPerBlock: 118 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 45 },
          { numBlocks: 14, dataCodewordsPerBlock: 46 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 24 },
          { numBlocks: 16, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 30, dataCodewordsPerBlock: 16 },
          { numBlocks: 2, dataCodewordsPerBlock: 17 },
        ],
      },
    ],
  },
  {
    infoBits: 0x191e1,
    versionNumber: 25,
    alignmentPatternCenters: [6, 32, 58, 84, 110],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 26,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 106 },
          { numBlocks: 4, dataCodewordsPerBlock: 107 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 47 },
          { numBlocks: 13, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 7, dataCodewordsPerBlock: 24 },
          { numBlocks: 22, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 22, dataCodewordsPerBlock: 15 },
          { numBlocks: 13, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1afab,
    versionNumber: 26,
    alignmentPatternCenters: [6, 30, 58, 86, 114],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 10, dataCodewordsPerBlock: 114 },
          { numBlocks: 2, dataCodewordsPerBlock: 115 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 46 },
          { numBlocks: 4, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 28, dataCodewordsPerBlock: 22 },
          { numBlocks: 6, dataCodewordsPerBlock: 23 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 33, dataCodewordsPerBlock: 16 },
          { numBlocks: 4, dataCodewordsPerBlock: 17 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1b08e,
    versionNumber: 27,
    alignmentPatternCenters: [6, 34, 62, 90, 118],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 122 },
          { numBlocks: 4, dataCodewordsPerBlock: 123 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 22, dataCodewordsPerBlock: 45 },
          { numBlocks: 3, dataCodewordsPerBlock: 46 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 8, dataCodewordsPerBlock: 23 },
          { numBlocks: 26, dataCodewordsPerBlock: 24 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 12, dataCodewordsPerBlock: 15 },
          { numBlocks: 28, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1cc1a,
    versionNumber: 28,
    alignmentPatternCenters: [6, 26, 50, 74, 98, 122],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 117 },
          { numBlocks: 10, dataCodewordsPerBlock: 118 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 3, dataCodewordsPerBlock: 45 },
          { numBlocks: 23, dataCodewordsPerBlock: 46 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 24 },
          { numBlocks: 31, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 15 },
          { numBlocks: 31, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1d33f,
    versionNumber: 29,
    alignmentPatternCenters: [6, 30, 54, 78, 102, 126],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 7, dataCodewordsPerBlock: 116 },
          { numBlocks: 7, dataCodewordsPerBlock: 117 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 21, dataCodewordsPerBlock: 45 },
          { numBlocks: 7, dataCodewordsPerBlock: 46 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 1, dataCodewordsPerBlock: 23 },
          { numBlocks: 37, dataCodewordsPerBlock: 24 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 15 },
          { numBlocks: 26, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1ed75,
    versionNumber: 30,
    alignmentPatternCenters: [6, 26, 52, 78, 104, 130],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 5, dataCodewordsPerBlock: 115 },
          { numBlocks: 10, dataCodewordsPerBlock: 116 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 47 },
          { numBlocks: 10, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 15, dataCodewordsPerBlock: 24 },
          { numBlocks: 25, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 23, dataCodewordsPerBlock: 15 },
          { numBlocks: 25, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x1f250,
    versionNumber: 31,
    alignmentPatternCenters: [6, 30, 56, 82, 108, 134],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 13, dataCodewordsPerBlock: 115 },
          { numBlocks: 3, dataCodewordsPerBlock: 116 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 46 },
          { numBlocks: 29, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 42, dataCodewordsPerBlock: 24 },
          { numBlocks: 1, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 23, dataCodewordsPerBlock: 15 },
          { numBlocks: 28, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x209d5,
    versionNumber: 32,
    alignmentPatternCenters: [6, 34, 60, 86, 112, 138],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 115 }],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 10, dataCodewordsPerBlock: 46 },
          { numBlocks: 23, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 10, dataCodewordsPerBlock: 24 },
          { numBlocks: 35, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 15 },
          { numBlocks: 35, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x216f0,
    versionNumber: 33,
    alignmentPatternCenters: [6, 30, 58, 86, 114, 142],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 17, dataCodewordsPerBlock: 115 },
          { numBlocks: 1, dataCodewordsPerBlock: 116 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 14, dataCodewordsPerBlock: 46 },
          { numBlocks: 21, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 29, dataCodewordsPerBlock: 24 },
          { numBlocks: 19, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 11, dataCodewordsPerBlock: 15 },
          { numBlocks: 46, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x228ba,
    versionNumber: 34,
    alignmentPatternCenters: [6, 34, 62, 90, 118, 146],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 13, dataCodewordsPerBlock: 115 },
          { numBlocks: 6, dataCodewordsPerBlock: 116 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 14, dataCodewordsPerBlock: 46 },
          { numBlocks: 23, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 44, dataCodewordsPerBlock: 24 },
          { numBlocks: 7, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 59, dataCodewordsPerBlock: 16 },
          { numBlocks: 1, dataCodewordsPerBlock: 17 },
        ],
      },
    ],
  },
  {
    infoBits: 0x2379f,
    versionNumber: 35,
    alignmentPatternCenters: [6, 30, 54, 78, 102, 126, 150],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 12, dataCodewordsPerBlock: 121 },
          { numBlocks: 7, dataCodewordsPerBlock: 122 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 12, dataCodewordsPerBlock: 47 },
          { numBlocks: 26, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 39, dataCodewordsPerBlock: 24 },
          { numBlocks: 14, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 22, dataCodewordsPerBlock: 15 },
          { numBlocks: 41, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x24b0b,
    versionNumber: 36,
    alignmentPatternCenters: [6, 24, 50, 76, 102, 128, 154],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 121 },
          { numBlocks: 14, dataCodewordsPerBlock: 122 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 6, dataCodewordsPerBlock: 47 },
          { numBlocks: 34, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 46, dataCodewordsPerBlock: 24 },
          { numBlocks: 10, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 2, dataCodewordsPerBlock: 15 },
          { numBlocks: 64, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x2542e,
    versionNumber: 37,
    alignmentPatternCenters: [6, 28, 54, 80, 106, 132, 158],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 17, dataCodewordsPerBlock: 122 },
          { numBlocks: 4, dataCodewordsPerBlock: 123 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 29, dataCodewordsPerBlock: 46 },
          { numBlocks: 14, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 49, dataCodewordsPerBlock: 24 },
          { numBlocks: 10, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 24, dataCodewordsPerBlock: 15 },
          { numBlocks: 46, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x26a64,
    versionNumber: 38,
    alignmentPatternCenters: [6, 32, 58, 84, 110, 136, 162],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 4, dataCodewordsPerBlock: 122 },
          { numBlocks: 18, dataCodewordsPerBlock: 123 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 13, dataCodewordsPerBlock: 46 },
          { numBlocks: 32, dataCodewordsPerBlock: 47 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 48, dataCodewordsPerBlock: 24 },
          { numBlocks: 14, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 42, dataCodewordsPerBlock: 15 },
          { numBlocks: 32, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x27541,
    versionNumber: 39,
    alignmentPatternCenters: [6, 26, 54, 82, 110, 138, 166],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 20, dataCodewordsPerBlock: 117 },
          { numBlocks: 4, dataCodewordsPerBlock: 118 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 40, dataCodewordsPerBlock: 47 },
          { numBlocks: 7, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 43, dataCodewordsPerBlock: 24 },
          { numBlocks: 22, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 10, dataCodewordsPerBlock: 15 },
          { numBlocks: 67, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
  {
    infoBits: 0x28c69,
    versionNumber: 40,
    alignmentPatternCenters: [6, 30, 58, 86, 114, 142, 170],
    errorCorrectionLevels: [
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 19, dataCodewordsPerBlock: 118 },
          { numBlocks: 6, dataCodewordsPerBlock: 119 },
        ],
      },
      {
        ecCodewordsPerBlock: 28,
        ecBlocks: [
          { numBlocks: 18, dataCodewordsPerBlock: 47 },
          { numBlocks: 31, dataCodewordsPerBlock: 48 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 34, dataCodewordsPerBlock: 24 },
          { numBlocks: 34, dataCodewordsPerBlock: 25 },
        ],
      },
      {
        ecCodewordsPerBlock: 30,
        ecBlocks: [
          { numBlocks: 20, dataCodewordsPerBlock: 15 },
          { numBlocks: 61, dataCodewordsPerBlock: 16 },
        ],
      },
    ],
  },
];