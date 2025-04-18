import { FORMAT_INFO_TABLE, VERSION_INFO } from "../Constants";
import { FormatBit } from "./TaggedBitstream";

const FORMAT_BITS = [
  new FormatBit({ bit: 0, source: "format", x: null, y: null }),
  new FormatBit({ bit: 1, source: "format", x: null, y: null })
]

const masked = false;

function getBitsFromFormatInfo(ecLevel, mask) {
  for (const entry of FORMAT_INFO_TABLE) {
    if (
      entry.formatInfo.errorCorrectionLevel ===
        ecLevel &&
      entry.formatInfo.dataMask === mask
    ) {
      return entry.bits;
    }
  }
  throw new Error("Format information not found");
}

export class FormatInfo {
  constructor({ errorCorrectionLevel, dataMask }) {
    //console.log("FormatInfo", { errorCorrectionLevel, dataMask });
    // Convert error correction level to its number equivalent
    if (/^[HMLQ]$/i.test(errorCorrectionLevel)) {
      let ecl = errorCorrectionLevel.toUpperCase();
      errorCorrectionLevel = ["M", "L", "H", "Q"].indexOf(ecl);
    } else {
      errorCorrectionLevel = parseInt(errorCorrectionLevel);
    }
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.dataMask = dataMask;
  }

  populate(matrix) {
    const bits = getBitsFromFormatInfo( this.errorCorrectionLevel, this.dataMask ).toString(2);
    const values = bits.split("").concat(bits.split(""));
    const size = matrix.length;
    const positions = [
      // Horizontal
      { x: 0, y: 8 },
      { x: 1, y: 8 },
      { x: 2, y: 8 },
      { x: 3, y: 8 },
      { x: 4, y: 8 },
      { x: 5, y: 8 },
      { x: 7, y: 8 },
      { x: size - 8, y: 8 },
      { x: size - 7, y: 8 },
      { x: size - 6, y: 8 },
      { x: size - 5, y: 8 },
      { x: size - 4, y: 8 },
      { x: size - 3, y: 8 },
      { x: size - 2, y: 8 },
      { x: size - 1, y: 8 },
      // Vertical
      { x: 8, y: size - 1 },
      { x: 8, y: size - 2 },
      { x: 8, y: size - 3 },
      { x: 8, y: size - 4 },
      { x: 8, y: size - 5 },
      { x: 8, y: size - 6 },
      { x: 8, y: size - 7 },
      { x: 8, y: 8 },
      { x: 8, y: 7 },
      { x: 8, y: 5 },
      { x: 8, y: 4 },
      { x: 8, y: 3 },
      { x: 8, y: 2 },
      { x: 8, y: 1 },
      { x: 8, y: 0 },
    ];
    // Tile the format bits
    for (let i = 0; i < values.length; i++) {
      const { x, y } = positions[i];
      matrix[y][x] = makeModule({ taggedBit: FORMAT_BITS[values[i]], x, y, masked });
    }

    // Add the dark module
    matrix[size - 8][8] = makeModule({ taggedBit: FORMAT_BITS[1], x: 8, y: size - 8, masked });
  }
}

import { PatternBit } from "./TaggedBitstream";

const FINDER_BITS = [
  new PatternBit({ bit: 0, patternType: "format", x: null, y: null }),
  new PatternBit({ bit: 1, patternType: "format", x: null, y: null }),
];

const SEPARATOR_BIT = new PatternBit({ bit: false, patternType: "separator" });

const TIMING_BITS = [
  new PatternBit({ bit: 0, patternType: "timing", x: null, y: null }),
  new PatternBit({ bit: 1, patternType: "timing", x: null, y: null }),
];

const ALIGNMENT_BITS = [
  new PatternBit({ bit: 0, patternType: "alignment", x: null, y: null }),
  new PatternBit({ bit: 1, patternType: "alignment", x: null, y: null }),
];

export class FinderPattern {
  static populate(matrix) {
    this.drawPattern(matrix, 0, 0);
    this.drawPattern(matrix, matrix.length - 7, 0);
    this.drawPattern(matrix, 0, matrix.length - 7);
    this.drawSeparators(matrix);
  }

  static drawPattern(matrix, startX, startY) {
    const pattern = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];

    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const value = pattern[y][x];
        matrix[startY + y][startX + x] = makeModule({
          taggedBit: FINDER_BITS[value],
          x,
          y,
          masked,
        });
      }
    }
  }

  static drawSeparators(matrix) {
    const module = new PatternBit({ bit: false, patternType: "separator" });
    const size = matrix.length;

    // Top-left separator
    for (let i = 0; i < 8; i++) {
      matrix[i][7] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: 7,
        y: i,
        masked,
      });
      matrix[7][i] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: i,
        y: 7,
        masked,
      });
    }

    // Top-right separator
    for (let i = 0; i < 8; i++) {
      matrix[i][size - 8] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: size - 8,
        y: i,
        masked,
      });
      matrix[7][size - 1 - i] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: size - 1 - i,
        y: 7,
        masked,
      });
    }

    // Bottom-left separator
    for (let i = 0; i < 8; i++) {
      matrix[size - 1 - i][7] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: 7,
        y: size - 1 - i,
        masked,
      });
      matrix[size - 8][i] = makeModule({
        taggedBit: SEPARATOR_BIT,
        x: i,
        y: size - 8,
        masked,
      });
    }
  }
}

export class TimingPattern {
  static populate(matrix) {
    const darkModule = new PatternBit({ bit: true, patternType: "timing" });
    const lightModule = new PatternBit({ bit: false, patternType: "timing" });
    const size = matrix.length;
    for (let i = 8; i < size - 8; i++) {
      if (i % 2 === 0) {
        matrix[6][i] = makeModule({
          taggedBit: TIMING_BITS[1],
          x: i,
          y: 6,
          masked,
        });
        matrix[i][6] = makeModule({
          taggedBit: TIMING_BITS[1],
          x: 6,
          y: i,
          masked,
        });
      } else {
        matrix[6][i] = makeModule({
          taggedBit: TIMING_BITS[0],
          x: i,
          y: 6,
          masked,
        });
        matrix[i][6] = makeModule({
          taggedBit: TIMING_BITS[0],
          x: 6,
          y: i,
          masked,
        });
      }
    }
  }
}

export class AlignmentPattern {
  constructor(version) {
    this.version = version;
  }

  populate(matrix) {
    const positions = this.getAlignmentPatternPositions();
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (
          AlignmentPattern.shouldDrawAlignmentPattern(
            matrix,
            positions[i],
            positions[j]
          )
        ) {
          AlignmentPattern.drawAlignmentPattern(
            matrix,
            positions[i],
            positions[j]
          );
        }
      }
    }
  }

  static shouldDrawAlignmentPattern(matrix, x, y) {
    const finderPatternPositions = [
      { x: 0, y: 0 },
      { x: matrix.length - 7, y: 0 },
      { x: 0, y: matrix.length - 7 },
    ];

    for (const pos of finderPatternPositions) {
      if (Math.abs(pos.x - x) < 9 && Math.abs(pos.y - y) < 9) {
        return false;
      }
    }
    return true;
  }

  static drawAlignmentPattern(matrix, centerX, centerY) {
    const darkModule = new PatternBit({ bit: true, patternType: "alignment" });
    const lightModule = new PatternBit({
      bit: false,
      patternType: "alignment",
    });
    const pattern = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const value = pattern[y][x];
        matrix[centerY - 2 + y][centerX - 2 + x] = makeModule({
          taggedBit: FINDER_BITS[value],
          x: centerX - 2 + x,
          y: centerY - 2 + y,
          masked,
        });
      }
    }
  }

  getAlignmentPatternPositions() {
    const version = this.version;
    if (version === 1) return [];
    const positions = [6];
    const numPositions = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 17 - 13) / (numPositions - 1));
    for (
      let pos = version * 4 + 10 - step * (numPositions - 2);
      pos >= 6;
      pos -= step
    ) {
      positions.push(pos);
    }
    positions.push(version * 4 + 10);
    return positions;
  }
}

import { VersionBit } from "./TaggedBitstream";

export class VersionInfo {
  constructor(version) {
    if (typeof version === "object") {
      this.version = version;
    } else {
      this.version = VERSION_INFO[version];
    }
    const { versionNumber, infoBits } = this.version;
    this.versionNumber = version;
    this.infoBits = infoBits;
  }

  populate(matrix) {
    if (this.versionNumber < 7) return;
    const source = "version";
    const posVal = "black";
    const negVal = "white";
    const versionString = this.getVersionString();
    const size = matrix.length;

    // Bottom-left version information
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j] === "1" ? posVal : negVal;
        matrix[size - 11 + j][i] = new VersionBit({ bit: value });
      }
    }

    // Top-right version information
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j] === "1" ? posVal : negVal;
        matrix[i][size - 11 + j] = new VersionBit({ bit: value });
      }
    }
  }

  get numModules() {
    return this.versionNumber * 4 + 17;
  }

  getVersionString() {
    const versionBits = this.infoBits.toString(2).padStart(6, "0");
    const paddedVersionBits = versionBits.padEnd(18, "0");
    const generator = 0b1111100100101; // Generator polynomial for BCH(18, 6)

    const errorCorrectionBits = VersionInfo.computeBCH(
      paddedVersionBits,
      generator,
      12
    );
    return (versionBits + errorCorrectionBits).padStart(18, "0");
  }

  static computeBCH(bits, generator, length) {
    const maxIter = 9;
    let iters = 0;
    let bitsInt = parseInt(bits, 2);
    bits = bitsInt.toString(2);

    while (bits.length > length && iters < maxIter) {
      const padLength = bits.length - (length + 1);
      const genStep = generator << padLength;
      bitsInt ^= genStep;
      bits = bitsInt.toString(2);
      iters++;
    }

    return bits.padStart(length, "0");
  }
}

export function makeModule({ taggedBit, x, y, masked }) {
  const { value, source } = taggedBit;
  return {
    bit: taggedBit,
    x,
    y,
    isMasked: masked,
    isHighlighted: false,
  };
}