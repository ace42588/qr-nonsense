import { QRMatrix, Source } from "../../../shared/types";
import { FORMAT_INFO_TABLE } from "@/domain/qr/constants/formatInfo";
import { makeNonDataModule } from "./utils";

interface FormatInfoSource extends Source {
  type: "formatInfo";
}

interface FormatInfo {
  errorCorrectionLevel: number;
  dataMask: number;
}

interface FormatInfoTableEntry {
  formatInfo: FormatInfo;
  bits: number;
}

const source: FormatInfoSource = {
  id: crypto.randomUUID(),
  name: "FormatInfo",
  type: "formatInfo",
};

/**
 * Gets format information bits for a given error correction level and data mask.
 * 
 * When mask is -1 (auto mask selection), returns a placeholder value that will be
 * replaced once the optimal mask is determined during matrix generation.
 * 
 * @param ecLevel - Error correction level (0-3)
 * @param mask - Data mask index (0-7), or -1 for auto selection
 * @returns Format information bits (15 bits) or placeholder value (0x4000) if mask is -1
 */
export function getBitsFromFormatInfo(ecLevel: number, mask: number | null = -1): number {
  // During auto mask selection, return placeholder that will be replaced
  // after the optimal mask is determined in getMatrix()
  // Also handle null (mask "none") - use placeholder
  if (mask === -1 || mask === null || Number.isNaN(mask)) {
    return 0x4000; // Placeholder value - will be replaced with actual format info
  }
  
  const info = (FORMAT_INFO_TABLE as FormatInfoTableEntry[]).find(
    ({ formatInfo: { errorCorrectionLevel: ecl, dataMask: dm } }) =>
      ecl === ecLevel && dm === mask
  );
  
  if (!info || !info.bits) {
    throw new Error(
      `Format information not found for EC level ${ecLevel} and mask ${mask}`
    );
  }
  
  return info.bits;
}

function placeModules(matrix: QRMatrix, bits: string): QRMatrix {
  const size = matrix.length;

  // Horizontal
  [
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
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(bits[idx], source, x, y))
  );

  // Vertical
  [
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
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(bits[idx], source, x, y))
  );

  // Add the dark module
  matrix[size - 8][8] = makeNonDataModule(
    1,
    { ...source, name: "dark module" },
    8,
    size - 8
  );
  return matrix;
}

export function addFormatInfoPlaceholders(matrix: QRMatrix): QRMatrix {
  const dummyBits = "000000000000000";
  return placeModules(matrix, dummyBits);
}

export function updateFormatInfoModules(matrix: QRMatrix, errorCorrectionLevel: number, dataMask: number | null): QRMatrix {
  const formatInfo = getBitsFromFormatInfo(errorCorrectionLevel, dataMask);
  return placeModules(matrix, formatInfo.toString(2).padStart(15, "0"));
} 