import { FINDER_PATTERN, FORMAT_INFO_TABLE, VERSION_INFO } from "../Constants";

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

function makeNonDataModule(value, source, x, y) {
  const taggedBit = {
    value,
    source,
  };
  return makeModule({ taggedBit, x, y, masked: false });
}

function getBitsFromFormatInfo(ecLevel, mask) {
  for (const entry of FORMAT_INFO_TABLE) {
    if (
      entry.formatInfo.errorCorrectionLevel === ecLevel &&
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
    const bits = getBitsFromFormatInfo(
      this.errorCorrectionLevel,
      this.dataMask
    ).toString(2);
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
      matrix[y][x] = makeNonDataModule(values[i], "FormatInfo", x, y);
    }

    // Add the dark module
    matrix[size - 8][8] = makeNonDataModule(1, 8, size - 8);
  }
}

export class FinderPattern {
  static populate(matrix) {
    this.drawPattern(matrix, 0, 0);
    this.drawPattern(matrix, matrix.length - 7, 0);
    this.drawPattern(matrix, 0, matrix.length - 7);
    this.drawSeparators(matrix);
  }

  static drawPattern(matrix, startX, startY) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const value = FINDER_PATTERN[y][x];
        matrix[startY + y][startX + x] = makeNonDataModule(
          value,
          "FinderPattern",
          x,
          y
        );
      }
    }
  }

  static drawSeparators(matrix) {
    const size = matrix.length;
    const source = "Separator";

    for (let i = 0; i < 8; i++) {
      // Top-left separator
      matrix[i][7] = makeNonDataModule(0, source, 7, i);
      matrix[7][i] = makeNonDataModule(0, source, i, 7);
      // Top-right separator
      matrix[i][size - 8] = makeNonDataModule(0, source, size - 8, i);
      matrix[7][size - 1 - i] = makeNonDataModule(0, source, size - 1 - i, 7);
      // Bottom-left separator
      matrix[size - 1 - i][7] = makeNonDataModule(0, source, 7, size - 1 - i);
      matrix[size - 8][i] = makeNonDataModule(0, source, i, size - 8);
    }
  }
}

export class TimingPattern {
  static populate(matrix) {
    const size = matrix.length;
    for (let i = 8; i < size - 8; i++) {
      const even = i % 2 === 0;
      matrix[6][i] = makeNonDataModule(even, "TimingPattern", i, 6);
      matrix[i][6] = makeNonDataModule(even, "TimingPattern", 6, i);
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
        matrix[centerY - 2 + y][centerX - 2 + x] = makeNonDataModule(
          value,
          "AlignmentPattern",
          centerX - 2 + x,
          centerY - 2 + y
        );
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
    const source = "VersionInfo";
    const versionString = this.getVersionString();
    const size = matrix.length;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j];
        // Bottom-left version information
        matrix[size - 11 + j][i] = makeNonDataModule(
          value,
          source,
          size - 11 + j,
          i
        );
        // Top-right version information
        matrix[i][size - 11 + j] = makeNonDataModule(
          value,
          source,
          i,
          size - 11 + j
        );
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

export function addNonDataModules(matrix, errorCorrectionLevel, dataMask) {
  const size = matrix.length;
  function addFormatInfoModules() {
    const bits = getBitsFromFormatInfo(errorCorrectionLevel, dataMask).toString(
      2
    );
    const values = `${bits}${bits}`;
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
      matrix[y][x] = makeNonDataModule(values[i], "FormatInfo", x, y);
    }

    // Add the dark module
    matrix[size - 8][8] = makeNonDataModule(1, 8, size - 8);
  }
  function addFinderPatterns() {
    function drawPattern(matrix, startX, startY) {
      const source = "FinderPattern";
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const value = FINDER_PATTERN[y][x];
          matrix[startY + y][startX + x] = makeNonDataModule(
            value,
            source,
            x,
            y
          );
        }
      }
    }

    function drawSeparators(matrix) {
      const source = "Separator";

      for (let i = 0; i < 8; i++) {
        // Top-left separator
        matrix[i][7] = makeNonDataModule(0, source, 7, i);
        matrix[7][i] = makeNonDataModule(0, source, i, 7);
        // Top-right separator
        matrix[i][size - 8] = makeNonDataModule(0, source, size - 8, i);
        matrix[7][size - 1 - i] = makeNonDataModule(0, source, size - 1 - i, 7);
        // Bottom-left separator
        matrix[size - 1 - i][7] = makeNonDataModule(0, source, 7, size - 1 - i);
        matrix[size - 8][i] = makeNonDataModule(0, source, i, size - 8);
      }
    }
    drawPattern(matrix, 0, 0);
    drawPattern(matrix, size - 7, 0);
    drawPattern(matrix, 0, size - 7);
    drawSeparators(matrix);
  }
}
