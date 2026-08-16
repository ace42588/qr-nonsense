/**
 * Reed-Solomon prefilter for data/EC flip candidates.
 * Skip expensive jsQR when every block still recovers the original data.
 */

import { QRBlock } from "@/domain/qr/codewords/blocks";
import {
  buildBitIdIndex,
  getDamagedReceived,
  type BitLocation,
} from "@/domain/qr/reedsolomon/applyFlips";
import { decodeReedSolomon } from "@/domain/qr/reedsolomon";
import { codewordsToBytes } from "@/domain/qart/codewordConversion";

/** Structured-clone-safe block snapshot for workers. */
export interface SerializedRsBlock {
  dataBytes: number[];
  ecBytes: number[];
  /** Bit ids in data∥EC order, MSB-first within each byte (8 per codeword). */
  bitIds: string[];
}

export function serializeRsBlocks(blocks: QRBlock[]): SerializedRsBlock[] {
  return blocks.map((block) => {
    const { dataBytes, ecBytes } = codewordsToBytes(block);
    const bitIds: string[] = [];
    for (const cw of block.data) {
      for (const bit of cw.bits) bitIds.push(bit.id);
    }
    for (const cw of block.errorCorrection) {
      for (const bit of cw.bits) bitIds.push(bit.id);
    }
    return {
      dataBytes: Array.from(dataBytes),
      ecBytes: Array.from(ecBytes),
      bitIds,
    };
  });
}

function buildIndexFromSerialized(
  blocks: SerializedRsBlock[]
): Map<string, BitLocation> {
  const index = new Map<string, BitLocation>();
  blocks.forEach((block, blockIndex) => {
    const totalBytes = block.dataBytes.length + block.ecBytes.length;
    for (let byteIndex = 0; byteIndex < totalBytes; byteIndex++) {
      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        const id = block.bitIds[byteIndex * 8 + bitIndex];
        if (id) index.set(id, { blockIndex, byteIndex, bitIndex });
      }
    }
  });
  return index;
}

function damagedReceivedFromSerialized(
  block: SerializedRsBlock,
  blockIndex: number,
  flippedBitIds: Iterable<string>,
  bitIndex: Map<string, BitLocation>
): Uint8ClampedArray {
  const received = new Uint8ClampedArray(
    block.dataBytes.length + block.ecBytes.length
  );
  received.set(block.dataBytes, 0);
  received.set(block.ecBytes, block.dataBytes.length);

  for (const bitId of flippedBitIds) {
    const loc = bitIndex.get(bitId);
    if (!loc || loc.blockIndex !== blockIndex) continue;
    const mask = 1 << (7 - loc.bitIndex);
    received[loc.byteIndex] ^= mask;
  }
  return received;
}

export type RsPrefilterOutcome =
  | "unchanged"
  | "miscorrected"
  | "decode_failed";

/**
 * Apply data/EC bit flips and see whether RS still recovers the original data.
 * - unchanged: every block recovers original → skip jsQR
 * - miscorrected: at least one block recovers different data → try jsQR
 * - decode_failed: some block fails RS → skip jsQR (not a collision under our def)
 */
export function classifyRsPrefilter(
  blocks: QRBlock[] | SerializedRsBlock[],
  flippedBitIds: Iterable<string>,
  twoS: number
): RsPrefilterOutcome {
  if (!blocks?.length || !twoS) return "unchanged";

  const isSerialized =
    Array.isArray((blocks[0] as SerializedRsBlock).dataBytes) &&
    Array.isArray((blocks[0] as SerializedRsBlock).bitIds);

  if (isSerialized) {
    const serialized = blocks as SerializedRsBlock[];
    const index = buildIndexFromSerialized(serialized);
    let anyMiscorrect = false;

    for (let i = 0; i < serialized.length; i++) {
      const block = serialized[i];
      const received = damagedReceivedFromSerialized(
        block,
        i,
        flippedBitIds,
        index
      );
      const result = decodeReedSolomon(received, twoS);
      if (!result.ok) return "decode_failed";

      const nd = block.dataBytes.length;
      const corrected = result.corrected.subarray(0, nd);
      for (let b = 0; b < nd; b++) {
        if (corrected[b] !== block.dataBytes[b]) {
          anyMiscorrect = true;
          break;
        }
      }
    }
    return anyMiscorrect ? "miscorrected" : "unchanged";
  }

  const qrBlocks = blocks as QRBlock[];
  const index = buildBitIdIndex(qrBlocks);
  let anyMiscorrect = false;

  for (let i = 0; i < qrBlocks.length; i++) {
    const block = qrBlocks[i];
    const { dataBytes } = codewordsToBytes(block);
    const received = getDamagedReceived(block, i, flippedBitIds, index);
    const result = decodeReedSolomon(received, twoS);
    if (!result.ok) return "decode_failed";

    const corrected = result.corrected.subarray(0, dataBytes.length);
    for (let b = 0; b < dataBytes.length; b++) {
      if (corrected[b] !== dataBytes[b]) {
        anyMiscorrect = true;
        break;
      }
    }
  }
  return anyMiscorrect ? "miscorrected" : "unchanged";
}

/** True when jsQR is worth running for a data/EC-only flip set. */
export function shouldRunJsQrAfterRsPrefilter(
  blocks: QRBlock[] | SerializedRsBlock[],
  flippedBitIds: Iterable<string>,
  twoS: number
): boolean {
  return classifyRsPrefilter(blocks, flippedBitIds, twoS) === "miscorrected";
}
