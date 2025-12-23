/**
 * Basis matrix operations for QArt optimization
 * 
 * The basis matrix tracks which bits can be controlled while maintaining
 * Reed-Solomon correctness. This is the core of the QArt algorithm.
 */

import { QRBlock } from "../qr/codewords/blocks";
import { ReedSolomonEncoder } from "../qr/reedsolomon";
import { codewordsToBytes, bytesToCodewords } from "./codewordConversion";
import { BlockBasisState } from "./types";

/**
 * Initialize basis matrix for a block
 * Builds the basis matrix showing which bits can be controlled
 */
export function initBlockBasis(
  block: QRBlock,
  ecCodewordsPerBlock: number
): BlockBasisState {
  const nd = block.data.length;
  const nc = block.errorCorrection.length;
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);

  // Convert codewords to bytes
  const { dataBytes, ecBytes } = codewordsToBytes(block);

  // Current state: data + EC
  const B = new Uint8ClampedArray(nd + nc);
  B.set(dataBytes, 0);
  B.set(ecBytes, nd);

  // Build basis matrix M: for each data bit, see what happens when we flip it
  const M: Uint8ClampedArray[] = [];
  for (let i = 0; i < nd * 8; i++) {
    const row = new Uint8ClampedArray(nd + nc);
    // Set bit i to 1
    row[Math.floor(i / 8)] = 1 << (7 - (i % 8));
    // Compute EC for this unit vector
    const rowEC = encoder.encode(row.subarray(0, nd));
    row.set(rowEC, nd);
    M.push(row);
  }

  return { B, M, savedM: [], encoder, dataBytes, ecBytes };
}

/**
 * Try to set a bit in the block using basis matrix
 * bitIndex can be:
 *   - 0 to nd*8-1: data bit index
 *   - nd*8 to (nd+nc)*8-1: EC bit index
 * Returns true if successful, false if bit cannot be controlled
 */
export function setBlockBit(
  state: BlockBasisState,
  bitIndex: number,
  bitValue: number
): boolean {
  const { B, M } = state;
  const totalBits = B.length * 8;
  
  // Validate bit index
  if (bitIndex < 0 || bitIndex >= totalBits) {
    return false;
  }
  
  const bitByte = Math.floor(bitIndex / 8);
  const bitPos = 7 - (bitIndex % 8);
  const bitMask = 1 << bitPos;

  // Find a basis vector in the active basis that can control this bit
  // CRITICAL: We must always consume a basis vector (remove row from M) even if the bit already matches,
  // to match Go implementation behavior. This ensures priority ordering matters - high-priority modules
  // consume basis vectors first, leaving fewer for low-priority modules.
  // The basis matrix M contains vectors showing the effect of flipping each data bit
  // Each vector affects both data and EC bits, allowing indirect EC control
  // CRITICAL: Prefer basis vectors that correspond directly to padding data bits
  // to avoid affecting user data bytes through linear combinations
  let foundIdx = -1;
  let bestIdx = -1; // Track best candidate (prefer direct padding bit vectors)
  
  if (state.paddingByteIndices) {
    // First, try to find a basis vector that corresponds to a padding data bit
    // and doesn't affect user data bytes
    const nd = state.dataBytes.length;
    for (let j = 0; j < M.length; j++) {
      if ((M[j][bitByte] & bitMask) !== 0) {
        // Check if this basis vector only affects padding bytes
        let onlyAffectsPadding = true;
        const sourceBitByte = Math.floor(j / 8);
        if (sourceBitByte < nd && !state.paddingByteIndices.has(sourceBitByte)) {
          // This basis vector comes from a user data bit - skip it
          continue;
        }
        // Check if this vector affects any user data bytes
        for (let k = 0; k < nd; k++) {
          if (M[j][k] !== 0 && !state.paddingByteIndices.has(k)) {
            onlyAffectsPadding = false;
            break;
          }
        }
        if (onlyAffectsPadding) {
          bestIdx = j;
          break; // Found a perfect match - use it immediately
        }
        if (foundIdx === -1) {
          foundIdx = j; // Fallback candidate
        }
      }
    }
    foundIdx = bestIdx !== -1 ? bestIdx : foundIdx;
  } else {
    // No padding restrictions - use first available
    for (let j = 0; j < M.length; j++) {
      if ((M[j][bitByte] & bitMask) !== 0) {
        foundIdx = j;
        break;
      }
    }
  }

  if (foundIdx === -1) {
    return false; // Cannot control this bit - no active basis vector available
  }

  // Swap found row to front
  if (foundIdx !== 0) {
    [M[0], M[foundIdx]] = [M[foundIdx], M[0]];
  }

  const targ = M[0];

  // Eliminate this bit from all other rows in M (Gaussian elimination)
  // This ensures only this row controls this bit in the active basis
  for (let j = 1; j < M.length; j++) {
    if ((M[j][bitByte] & bitMask) !== 0) {
      // XOR to eliminate this bit from other rows
      for (let k = 0; k < M[j].length; k++) {
        M[j][k] ^= targ[k];
      }
    }
  }

  // Also eliminate from saved rows to maintain basis property
  // This ensures saved rows don't conflict with the current control
  for (const row of state.savedM) {
    if ((row[bitByte] & bitMask) !== 0) {
      for (let k = 0; k < row.length; k++) {
        row[k] ^= targ[k];
      }
    }
  }

  // Apply to current data (we already checked it's not the desired value)
  // XOR the basis vector to flip the bit
  // CRITICAL: This XORs the entire basis vector, which can affect multiple bytes
  // We need to ensure we don't modify user data bytes
  if (state.paddingByteIndices) {
    // Check if this modification would affect any non-padding bytes
    const nd = state.dataBytes.length;
    const affectedUserDataBytes: number[] = [];
    for (let j = 0; j < nd; j++) {
      if (targ[j] !== 0 && !state.paddingByteIndices.has(j)) {
        affectedUserDataBytes.push(j);
      }
    }
    if (affectedUserDataBytes.length > 0) {
      // This basis vector would modify user data bytes - reject it
      if (!state._rejectionCount) state._rejectionCount = 0;
      state._rejectionCount++;
      return false;
    }
  }
  
  // Apply to current data only if bit doesn't already match (matches Go implementation)
  // CRITICAL: We still consume the basis vector (remove row from M) even if bit already matches,
  // to ensure priority ordering matters - high-priority modules consume basis vectors first
  const currentBit = (B[bitByte] >> bitPos) & 1;
  if (currentBit !== bitValue) {
    // Bit doesn't match - XOR the basis vector to flip it
    for (let j = 0; j < B.length; j++) {
      B[j] ^= targ[j];
    }
  }
  // else: bit already matches, but we still consume the basis vector (matches Go canSet behavior)

  // Move used row to saved rows (like Go's m[len(m):cap(m)])
  // Saved rows are kept for reference but not reused (they maintain basis property)
  // CRITICAL: Always remove row from M, even if bit already matched, to match Go implementation
  const usedRow = M.shift()!;
  state.savedM.push(usedRow);

  return true;
}

/**
 * Apply basis matrix changes back to block codewords
 */
export function applyBlockBasis(block: QRBlock, state: BlockBasisState): void {
  const { B, dataBytes, ecBytes } = state;
  const nd = dataBytes.length;

  // Copy back to byte arrays
  dataBytes.set(B.subarray(0, nd));
  ecBytes.set(B.subarray(nd));

  // Update codeword bits from bytes
  bytesToCodewords(block, dataBytes, ecBytes);
}

