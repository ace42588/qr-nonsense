import { FormatInfo } from "./encode/FormatInfo";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "./encode/FunctionPatterns";
import { VersionInfo } from "./encode/VersionInfo";
import { VERSIONS } from "./encode/version";
import { ModuleFactory } from "./QRModule";

function setRegion(matrix, left, top, width, height, v) {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      matrix[y][x] = v;
    }
  }
}

/**
 * Apply all 8 masks, calculate penalties, and return the mask index with the lowest score.
 * @param {Array<Array<number>>} matrix - 2D array representing the QR code (1 = dark, 0 = light)
 * @returns {number} The best mask pattern index (0 to 7)
 */
function selectBestMask(matrix) {
    const maskFunctions = [
        (r, c) => (r + c) % 2 === 0,
        (r, c) => r % 2 === 0,
        (r, c) => c % 3 === 0,
        (r, c) => (r + c) % 3 === 0,
        (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    ];

    let minPenalty = Infinity;
    let bestMask = 0;

    for (let i = 0; i < 8; i++) {
        const masked = applyMask(matrix, maskFunctions[i]);
        const penalty = calculatePenalty(masked);
        if (penalty < minPenalty) {
            minPenalty = penalty;
            bestMask = i;
        }
    }

    return bestMask;
}

/**
 * Apply a mask function to a QR matrix.
 * @param {Array<Array<number>>} matrix
 * @param {Function} maskFunc
 * @returns {Array<Array<number>>} masked matrix
 */
function applyMask(matrix, maskFunc) {
    const size = matrix.length;
    const masked = matrix.map(row => [...row]);
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // Assume functional area like finder patterns are excluded
            if (maskFunc(r, c)) {
                masked[r][c] ^= 1;
            }
        }
    }
    return masked;
}

/**
 * Compute the penalty score of a QR matrix based on 4 rules.
 * @param {Array<Array<number>>} matrix
 * @returns {number} penalty score
 */
function calculatePenalty(matrix) {
    const size = matrix.length;
    let score = 0;

    // Rule 1: Consecutive modules in row/column
    for (let r = 0; r < size; r++) {
        score += penaltyConsecutive(matrix[r]);
        const col = matrix.map(row => row[r]);
        score += penaltyConsecutive(col);
    }

    // Rule 2: 2x2 blocks of same color
    for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
            const color = matrix[r][c];
            if (
                matrix[r][c + 1] === color &&
                matrix[r + 1][c] === color &&
                matrix[r + 1][c + 1] === color
            ) {
                score += 3;
            }
        }
    }

    // Rule 3: Finder-like patterns (1:1:3:1:1 ratio)
    const pattern1 = [1, 0, 1, 1, 1, 0, 1];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size - 6; c++) {
            if (matchesPattern(matrix[r].slice(c, c + 7), pattern1)) {
                if (hasWhiteBorder(matrix[r], c)) score += 40;
            }

            const col = matrix.map(row => row[c]);
            const segment = col.slice(r, r + 7);
            if (segment.length === 7 && matchesPattern(segment, pattern1)) {
                if (hasWhiteBorder(col, r)) score += 40;
            }
        }
    }

    // Rule 4: Dark/light ratio
    const totalModules = size * size;
    const darkModules = matrix.flat().reduce((acc, v) => acc + v, 0);
    const percent = (darkModules / totalModules) * 100;
    const deviation = Math.abs(percent - 50);
    score += Math.floor(deviation / 5) * 10;

    return score;
}

function penaltyConsecutive(line) {
    let score = 0, count = 1;
    for (let i = 1; i < line.length; i++) {
        if (line[i] === line[i - 1]) {
            count++;
            if (count === 5) score += 3;
            else if (count > 5) score++;
        } else {
            count = 1;
        }
    }
    return score;
}

function matchesPattern(arr, pattern) {
    return arr.length === pattern.length && arr.every((v, i) => v === pattern[i]);
}

function hasWhiteBorder(arr, start) {
    return (
        (start - 4 < 0 || arr.slice(start - 4, start).every(v => v === 0)) &&
        (start + 7 + 4 > arr.length || arr.slice(start + 7, start + 11).every(v => v === 0))
    );
}


export class QRCodeMatrix {
  constructor({ versionDetails, formatInfo }) {
    console.log("QRCodeMatrix", { versionDetails, formatInfo });
    //const { errorCorrectionLevel, dataMask } = formatInfo;
    this.versionInfo = new VersionInfo(versionDetails);
    this.alignmentPattern = new AlignmentPattern(versionDetails.versionNumber);
    this.formatInfo = new FormatInfo(formatInfo);
    this.moduleCount = this.versionInfo.numModules;
    this.matrix = Array.from({ length: this.moduleCount }, () =>
      Array(this.moduleCount).fill(false)
    );
    this.firstUse = true;
    this.history = [];
  }

  placeCodewords(codewords) {
    this.reset();
    const dimension = this.matrix.length;
    const mf = new ModuleFactory(this.formatInfo);
    const bits = codewords.flatMap((codeword) => codeword.bits);
    mf.setBitSource(bits);

    let up = true;
    // write columns in pairs, right to left
    for (let columnIdx = dimension - 1; columnIdx > 0; columnIdx -= 2) {
      // Skip the vertical timing pattern column
      if (columnIdx === 6) columnIdx--;

      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;

        for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
          let x = columnIdx - columnOffset;

          // check for pattern
          if (!this.matrix[y][x]) {
            this.matrix[y][x] = mf.getDataModule({ x, y });
          }
        }
      }
      up = !up; // Change direction
    }
    if (this.firstUse) {
      this.originalMatrix = this.matrix;
      this.history.push(this.matrix);
      this.firstUse = false;
    }
    //console.log("placeCodewords", this.matrix);
  }

  placeFunctionPatterns() {
    // Draw the finder patterns
    FinderPattern.populate(this.matrix);

    // Draw the timing patterns
    TimingPattern.populate(this.matrix);

    // Draw the alignment patterns for version 2 and above
    this.alignmentPattern.populate(this.matrix);

    // Draw format information
    this.formatInfo.populate(this.matrix);

    // Draw version information for versions 7 and above
    this.versionInfo.populate(this.matrix);
  }

  reset() {
    if (!this.firstUse) {
      this.history.push(this.matrix);
    }
    this.matrix = Array.from({ length: this.moduleCount }, () =>
      Array(this.moduleCount).fill(false)
    );
    this.placeFunctionPatterns();
  }
}
