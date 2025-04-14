import { VERSIONS } from "./version";
import { PatternBit } from "./TaggedBitstream";
import { makeModule } from "../Utilities";

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

const masked = false;

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
        /*
          new QRModule({
          taggedBit: FINDER_BITS[value],
          x,
          y,
          masked,
        });
        */
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
