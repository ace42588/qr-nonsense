import { FormatBit } from "./TaggedBit";
import { makeModule } from "../utility";

export const ErrorCorrectionLevel = ["M", "L", "H", "Q"];

const FORMAT_BITS = [
  new FormatBit({ bit: 0, source: "format", x: null, y: null }),
  new FormatBit({ bit: 1, source: "format", x: null, y: null })
]

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
  if (mask === "auto") return 0x0000;
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
      errorCorrectionLevel = ErrorCorrectionLevel.indexOf(ecl);
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