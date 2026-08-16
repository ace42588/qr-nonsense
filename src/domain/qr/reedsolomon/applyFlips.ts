import { QRBlock } from "../codewords/blocks";
import { codewordsToBytes } from "../../qart/codewordConversion";

export interface BitLocation {
  blockIndex: number;
  /** Index into the concatenated data∥EC byte array for the block */
  byteIndex: number;
  /** Bit within the byte, 0 = MSB … 7 = LSB */
  bitIndex: number;
}

/**
 * Map every data and EC bit id in all blocks to its byte/bit position.
 * Walks data codewords first, then EC, MSB-first (matches bitsToByte).
 */
export function buildBitIdIndex(
  blocks: QRBlock[]
): Map<string, BitLocation> {
  const index = new Map<string, BitLocation>();

  blocks.forEach((block, blockIndex) => {
    let byteIndex = 0;

    const indexCodewords = (codewords: typeof block.data) => {
      for (const codeword of codewords) {
        for (let bitIndex = 0; bitIndex < codeword.bits.length; bitIndex++) {
          const bit = codeword.bits[bitIndex];
          index.set(bit.id, { blockIndex, byteIndex, bitIndex });
        }
        byteIndex += 1;
      }
    };

    indexCodewords(block.data);
    indexCodewords(block.errorCorrection);
  });

  return index;
}

/**
 * Collect all bit ids belonging to a single block (data then EC).
 */
export function getBlockBitIds(block: QRBlock): string[] {
  const ids: string[] = [];
  for (const codeword of block.data) {
    for (const bit of codeword.bits) {
      ids.push(bit.id);
    }
  }
  for (const codeword of block.errorCorrection) {
    for (const bit of codeword.bits) {
      ids.push(bit.id);
    }
  }
  return ids;
}

/**
 * Clone data∥EC bytes for a block and XOR any flipped bits belonging to it.
 */
export function getDamagedReceived(
  block: QRBlock,
  blockIndex: number,
  flippedBitIds: Iterable<string>,
  bitIndex: Map<string, BitLocation>
): Uint8ClampedArray {
  const { dataBytes, ecBytes } = codewordsToBytes(block);
  const received = new Uint8ClampedArray(dataBytes.length + ecBytes.length);
  received.set(dataBytes, 0);
  received.set(ecBytes, dataBytes.length);

  for (const bitId of flippedBitIds) {
    const loc = bitIndex.get(bitId);
    if (!loc || loc.blockIndex !== blockIndex) continue;
    const mask = 1 << (7 - loc.bitIndex);
    received[loc.byteIndex] ^= mask;
  }

  return received;
}
