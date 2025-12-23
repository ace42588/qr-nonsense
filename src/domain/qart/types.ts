/**
 * Type definitions for QArt basis matrix operations
 */

import { ReedSolomonEncoder } from "../qr/reedsolomon";

/**
 * Block basis matrix state for QArt optimization
 * Tracks which bits can be controlled while maintaining Reed-Solomon correctness
 */
export interface BlockBasisState {
  B: Uint8ClampedArray; // Current data + EC bytes
  M: Uint8ClampedArray[]; // Basis matrix: M[i] shows effect of flipping data bit i
  savedM: Uint8ClampedArray[]; // Saved rows that have already been used (like Go's m[len(m):cap(m)])
  encoder: ReedSolomonEncoder;
  dataBytes: Uint8ClampedArray; // Reference to data bytes (will be updated)
  ecBytes: Uint8ClampedArray; // Reference to EC bytes (will be updated)
  paddingByteIndices?: Set<number>; // Indices of data bytes that are entirely padding (optional, for safety checks)
  _rejectionCount?: number; // Internal counter for debugging rejections
}

