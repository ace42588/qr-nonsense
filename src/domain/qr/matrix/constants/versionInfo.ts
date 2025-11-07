interface VersionInfoEntry {
  infoBits: number | null;
  alignmentPatternCenters: number[];
}

interface VersionInfoTable {
  [version: number]: VersionInfoEntry;
}

export const VERSION_INFO: VersionInfoTable = {
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