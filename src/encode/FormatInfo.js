import { FormatBit } from "./TaggedBit";
import { QRModule } from "../QRModule";

export const ErrorCorrectionLevel = ["M", "L", "H", "Q"];

const FORMAT_BITS = [
  new FormatBit({ bit: 0, source: "format", x: null, y: null }),
  new FormatBit({ bit: 1, source: "format", x: null, y: null }),
];

const masked = false;

const FORMAT_INFO_TABLE = [
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
    // Convert error correction level to its number equivalent
    if (/^[HMLQ]$/i.test(errorCorrectionLevel)) {
      let ecl = errorCorrectionLevel.toUpperCase();
      errorCorrectionLevel = ErrorCorrectionLevel.indexOf(ecl);
    }
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.dataMask = dataMask;
  }

  populate(matrix) {
    if (this.dataMask === "auto") {
      this.dataMask = selectBestMask(matrix);
    }
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
      matrix[y][x] = new QRModule({
        taggedBit: FORMAT_BITS[values[i]],
        x,
        y,
        masked,
      });
    }

    // Add the dark module
    matrix[size - 8][8] = new QRModule({
      taggedBit: FORMAT_BITS[1],
      x: 8,
      y: size - 8,
      masked,
    });
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
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
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
  const masked = matrix.map((row) => [...row]);
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
    const col = matrix.map((row) => row[r]);
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

      const col = matrix.map((row) => row[c]);
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
  let score = 0,
    count = 1;
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
    (start - 4 < 0 || arr.slice(start - 4, start).every((v) => v === 0)) &&
    (start + 7 + 4 > arr.length ||
      arr.slice(start + 7, start + 11).every((v) => v === 0))
  );
}
