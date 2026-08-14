import { calculateOtsuThreshold, detectQRBoundaries } from "./utils";

/**
 * Estimate format information damage by locating and validating format bits
 * @param {Uint8ClampedArray} data - Image data from canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @return {number} Damage estimate (0-1 scale, lower is better)
 */
export function estimateFormatInformationDamage(data, width, height) {
  // Step 1: Detect QR code boundaries and size
  const boundaries = detectQRBoundaries(data, width, height);
  if (!boundaries) return 1.0; // Could not detect QR code

  const { top, left, bottom, right } = boundaries;
  const qrSize = Math.max(bottom - top, right - left);
  const moduleSize = qrSize / 21; // Approximate module size (assuming version 1 QR code)

  // Step 2: Extract format information bits
  // Format information is located in two places:
  // 1. Around top-left finder pattern
  // 2. Split between bottom-left and top-right finder patterns

  // Get binary image
  const binaryData = getBinaryData(data, width, height);

  // Extract format bits from the first location (around top-left finder pattern)
  const formatBits1 = extractFormatBits1(
    binaryData,
    width,
    left,
    top,
    moduleSize
  );

  // Extract format bits from the second location (split between bottom-left and top-right)
  const formatBits2 = extractFormatBits2(
    binaryData,
    width,
    left,
    top,
    right,
    bottom,
    moduleSize
  );

  // Step 3: Compare the two copies of format information (they should be identical)
  let formatBitsDifference = 0;
  for (let i = 0; i < 15; i++) {
    if (formatBits1[i] !== formatBits2[i]) {
      formatBitsDifference++;
    }
  }

  // Step 4: Validate format information using BCH error correction
  const formatBits = formatBits1.slice(); // Use the first copy as reference
  let bchErrors = countBCHErrors(formatBits);

  // Step 5: Combine metrics to calculate overall damage
  // Weight both the difference between the two copies and the BCH errors
  const diffDamage = formatBitsDifference / 15; // Normalize to 0-1
  const bchDamage = Math.min(1.0, bchErrors / 3); // Normalize to 0-1 (can correct up to 3 errors)

  return diffDamage * 0.4 + bchDamage * 0.6; // Weighted average favoring BCH verification
}

/**
 * Extract format bits from around the top-left finder pattern
 * @return {Array} 15 format bits
 */
function extractFormatBits1(binaryData, width, left, top, moduleSize) {
  const formatBits = new Array(15);

  // Horizontal format bits (right of the top-left finder pattern)
  for (let i = 0; i < 8; i++) {
    const x = Math.round(left + (i < 6 ? i + 7 : i + 8) * moduleSize);
    const y = Math.round(top + 8 * moduleSize);
    const index = y * width + x;

    if (index >= 0 && index < binaryData.length) {
      formatBits[i] = binaryData[index];
    } else {
      formatBits[i] = 0; // Default value if out of bounds
    }
  }

  // Vertical format bits (below the top-left finder pattern)
  for (let i = 0; i < 7; i++) {
    const x = Math.round(left + 8 * moduleSize);
    const y = Math.round(top + (7 - i) * moduleSize);
    const index = y * width + x;

    if (index >= 0 && index < binaryData.length) {
      formatBits[i + 8] = binaryData[index];
    } else {
      formatBits[i + 8] = 0; // Default value if out of bounds
    }
  }

  return formatBits;
}

/**
 * Extract format bits from the second location
 * (split between bottom-left and top-right finder patterns)
 * @return {Array} 15 format bits
 */
function extractFormatBits2(
  binaryData,
  width,
  left,
  top,
  right,
  bottom,
  moduleSize
) {
  const formatBits = new Array(15);

  // Top-right vertical format bits
  for (let i = 0; i < 7; i++) {
    const x = Math.round(right - 8 * moduleSize);
    const y = Math.round(top + i * moduleSize);
    const index = y * width + x;

    if (index >= 0 && index < binaryData.length) {
      formatBits[i] = binaryData[index];
    } else {
      formatBits[i] = 0; // Default value if out of bounds
    }
  }

  // Bottom-left horizontal format bits
  for (let i = 0; i < 8; i++) {
    const x = Math.round(left + i * moduleSize);
    const y = Math.round(bottom - 8 * moduleSize);
    const index = y * width + x;

    if (index >= 0 && index < binaryData.length) {
      formatBits[i + 7] = binaryData[index];
    } else {
      formatBits[i + 7] = 0; // Default value if out of bounds
    }
  }

  return formatBits;
}

/**
 * Convert image data to binary (0 or 1) using Otsu's method
 * @return {Uint8Array} Binary image data
 */
function getBinaryData(data, width, height) {
  const grayValues = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray =
      (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    grayValues.push(gray);
  }

  const threshold = calculateOtsuThreshold(grayValues);
  const binary = new Uint8Array(width * height);

  for (let i = 0; i < grayValues.length; i++) {
    binary[i] = grayValues[i] > threshold ? 1 : 0;
  }

  return binary;
}

/**
 * Count BCH errors in format information
 * This uses the BCH(15,5) code used in QR codes
 * @param {Array} formatBits - 15 format bits
 * @return {number} Number of errors detected
 */
function countBCHErrors(formatBits) {
  // The format information uses a BCH(15,5) code
  // First 5 bits encode the format info, last 10 bits are error correction

  // XOR with the mask pattern (this uncovers the raw format information)
  const mask = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]; // 10101 00000 10010
  const unmaskedBits = formatBits.map((bit, index) => bit ^ mask[index]);

  // Calculate syndrome using BCH
  return calculateBCHSyndrome(unmaskedBits);
}

/**
 * Calculate BCH syndrome to detect errors
 * @param {Array} bits - Bits to check
 * @return {number} Number of errors detected
 */
function calculateBCHSyndrome(bits) {
  // Generator polynomial for BCH(15,5): x^10 + x^8 + x^5 + x^4 + x^2 + x + 1
  const generator = [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1]; // coefficients of the generator polynomial

  // Convert bit array to polynomial representation (most significant bit first)
  let data = bits.slice();

  // Calculate remainder using polynomial division (CRC)
  // Only consider the 5 data bits (first 5 bits) for error checking
  let dataLength = 5;

  // Perform polynomial long division
  for (let i = 0; i < dataLength; i++) {
    if (data[i] === 1) {
      for (let j = 0; j < generator.length; j++) {
        data[i + j] ^= generator[j];
      }
    }
  }

  // Count non-zero bits in the remainder (should be zero if no errors)
  let errorCount = 0;
  for (let i = dataLength; i < 15; i++) {
    if (data[i] === 1) {
      errorCount++;
    }
  }

  return errorCount;
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
