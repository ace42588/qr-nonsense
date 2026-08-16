/**
 * Reed-Solomon remaining correction budget for generated QR blocks.
 */

import type { QRBlock } from "@/domain/qr/codewords/blocks";
import { decodeReedSolomon } from "@/domain/qr/reedsolomon";
import {
  buildBitIdIndex,
  getDamagedReceived,
} from "@/domain/qr/reedsolomon/applyFlips";
import { codewordsToBytes } from "@/domain/qart/codewordConversion";
import type { RsBlockBudget, RsBudgetSummary } from "./types";

/**
 * Evaluate RS remaining budget for each block.
 * @param flippedBitIds optional bit ids treated as already flipped (e.g. from render recovery)
 */
export function computeRsRemainingBudget(
  blocks: QRBlock[],
  flippedBitIds?: Iterable<string>
): RsBudgetSummary {
  const flips = flippedBitIds ? [...flippedBitIds] : [];
  const index = flips.length > 0 ? buildBitIdIndex(blocks) : null;
  const results: RsBlockBudget[] = [];
  let remainingBudget = 0;
  let worstBlockRemaining = Infinity;
  let allOk = true;

  blocks.forEach((block, blockIndex) => {
    const twoS = block.errorCorrection.length;
    const t = Math.floor(twoS / 2);
    let received: Uint8ClampedArray;
    if (index && flips.length > 0) {
      received = getDamagedReceived(block, blockIndex, flips, index);
    } else {
      const { dataBytes, ecBytes } = codewordsToBytes(block);
      received = new Uint8ClampedArray(dataBytes.length + ecBytes.length);
      received.set(dataBytes, 0);
      received.set(ecBytes, dataBytes.length);
    }

    const decoded = decodeReedSolomon(received, twoS);
    const remaining = decoded.ok ? t - decoded.errorsCorrected : -1;
    if (!decoded.ok) allOk = false;
    remainingBudget += Math.max(0, remaining);
    if (decoded.ok) {
      worstBlockRemaining = Math.min(worstBlockRemaining, remaining);
    } else {
      worstBlockRemaining = -1;
    }

    results.push({
      blockIndex,
      t,
      errorsCorrected: decoded.errorsCorrected,
      remaining,
      ok: decoded.ok,
    });
  });

  if (!Number.isFinite(worstBlockRemaining)) {
    worstBlockRemaining = blocks.length === 0 ? 0 : -1;
  }

  return {
    blocks: results,
    remainingBudget,
    worstBlockRemaining,
    allOk,
  };
}
