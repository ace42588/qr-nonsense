/**
 * Utilities for converting between codewords and byte arrays
 */

import { QRBlock } from "../qr/codewords/blocks";
import { bitsToByte } from "../qr/codewords/bits";

/**
 * Convert block codewords to byte arrays
 */
export function codewordsToBytes(block: QRBlock): {
  dataBytes: Uint8ClampedArray;
  ecBytes: Uint8ClampedArray;
} {
  const nd = block.data.length;
  const nc = block.errorCorrection.length;

  const dataBytes = new Uint8ClampedArray(nd);
  for (let i = 0; i < nd; i++) {
    dataBytes[i] = bitsToByte(block.data[i].bits);
  }

  const ecBytes = new Uint8ClampedArray(nc);
  for (let i = 0; i < nc; i++) {
    ecBytes[i] = bitsToByte(block.errorCorrection[i].bits);
  }

  return { dataBytes, ecBytes };
}

/**
 * Update codeword bits from byte arrays
 */
export function bytesToCodewords(
  block: QRBlock,
  dataBytes: Uint8ClampedArray,
  ecBytes: Uint8ClampedArray
): void {
  // Update data codeword bits from bytes
  for (let i = 0; i < dataBytes.length; i++) {
    const byte = dataBytes[i];
    for (let bit = 0; bit < 8; bit++) {
      block.data[i].bits[bit].value = (byte >> (7 - bit)) & 1;
    }
  }

  // Update EC codeword bits from bytes
  for (let i = 0; i < ecBytes.length; i++) {
    const byte = ecBytes[i];
    for (let bit = 0; bit < 8; bit++) {
      block.errorCorrection[i].bits[bit].value = (byte >> (7 - bit)) & 1;
    }
  }
}

