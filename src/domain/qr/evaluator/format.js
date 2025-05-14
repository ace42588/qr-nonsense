import { FORMAT_INFO_TABLE } from "../constants";
/**
export function estimateFormatInformationDamage(data, width, height) {
  // In a real implementation, we would:
  // 1. Locate format information bits
  // 2. Check for errors using error correction
  
  // For this example, returning a simulated value
  // Lower values indicate less damage (better)
  return 0.10;
}
*/

const FORMAT_LOCATIONS = {
  primary: [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8],
    [5, 8], [7, 8], [8, 8], [8, 7], [8, 5],
    [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ],
  mirror: [
    [width - 1, 8], [width - 2, 8], [width - 3, 8],
    [width - 4, 8], [width - 5, 8], [width - 6, 8],
    [8, height - 1], [8, height - 2], [8, height - 3],
    [8, height - 4], [8, height - 5], [8, height - 6],
    [8, height - 7], [8, height - 8], [7, 8],
  ]
};

function extractFormatBits(data, width, coords, moduleSize) {
  let bits = "";
  for (let [x, y] of coords) {
    const px = Math.round(x * moduleSize);
    const py = Math.round(y * moduleSize);
    const idx = (py * width + px) * 4;
    const dark = data[idx] < 128;
    bits += dark ? "1" : "0";
  }
  return bits;
}

function hammingDistance(a, b) {
  return a.split("").filter((bit, i) => bit !== b[i]).length;
}

function decodeFormatInfo(bits) {
  // List of all 32 valid format strings (error-corrected)
  const distances = FORMAT_INFO_TABLE.map(valid => hammingDistance(valid.bits, bits));
  const minDist = Math.min(...distances);
  return minDist; // 0 = perfect match, >3 = unrecoverable
}

export function estimateFormatInformationDamage(data, width, height, version) {
  const moduleCount = 17 + version * 4;
  const moduleSize = width / moduleCount;

  const formatBits = extractFormatBits(data, width, FORMAT_LOCATIONS.primary, moduleSize);
  const errorBits = decodeFormatInfo(formatBits);
  return Math.min(errorBits / 3, 1); // 0 = perfect, 1 = max damage
}


/**
 * Grade format information damage
 */
export function gradeFormatDamage(damage) {
  if (damage <= 0.05) return "A";
  if (damage <= 0.1) return "B";
  if (damage <= 0.15) return "C";
  if (damage <= 0.2) return "D";
  return "F";
}
