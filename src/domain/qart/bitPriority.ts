/**
 * Bit priority calculation and ordering for QArt optimization
 */

import { QRBlock } from "../qr/codewords/blocks";
import { QRMatrix } from "../shared/types";

export interface BitPosition {
  bi: number; // Bit index within block (0 to nd*8-1 for data, nd*8 to (nd+nc)*8-1 for EC)
  x: number; // Module x position
  y: number; // Module y position
  priority: number;
  bitId: string; // Bit ID for tracking control
}

/**
 * Get bit position from block codewords
 */
function getBitPosition(
  block: QRBlock,
  bitIndex: number,
  isDataBit: boolean,
  matrix: QRMatrix,
  nd: number
): BitPosition | null {
  const codewords = isDataBit ? block.data : block.errorCorrection;
  const cwIdx = Math.floor(bitIndex / 8);
  const bitInCw = bitIndex % 8;

  if (cwIdx >= codewords.length) return null;
  
  const codeword = codewords[cwIdx];
  if (!codeword?.bits || bitInCw >= codeword.bits.length) return null;
  
  const bit = codeword.bits[bitInCw];
  if (!bit?.id) return null;
  
  const module = matrix.getModuleByBitId?.(bit.id);
  if (!module) return null;
  
  // Skip reserved/non-data modules (finder patterns, timing patterns, format info, etc.)
  // These cannot be modified as they're part of the QR code structure
  if (module.nonData) return null;
  
  return {
    bi: isDataBit ? bitIndex : nd * 8 + bitIndex,
    x: module.x,
    y: module.y,
    priority: 0, // Will be calculated later
    bitId: bit.id,
  };
}

/**
 * Priority function type
 * - contrast: high local variance first (classic QArt)
 * - random: uniform random order
 * - roi: prefer matching outside ROI so instance regions stay image-owned
 */
export type PriorityFunctionType = "contrast" | "random" | "roi";

/** Round priority weights to the nearest 50 for stability. */
const QUANTIZATION_STEP = 50;

/**
 * Collect all controllable bits (data + EC) together for unified
 * prioritization, with priority left at 0.
 *
 * CRITICAL: Include ALL data bits from editable segments (padding or
 * QArt-append). The basis matrix algorithm (setBlockBit) will check if a
 * basis vector affects user data bytes and reject it if necessary. We
 * should include all editable bits and let setBlockBit decide. This allows
 * controlling individual bits even when they're in codewords that also
 * contain user data.
 */
function collectControllableBits(
  block: QRBlock,
  matrix: QRMatrix,
  editableSegmentIds: Set<string>,
  excludeLastSegmentBits?: Set<string>,
  appendSegmentIds?: Set<string>
): BitPosition[] {
  const nd = block.data.length;
  const nc = block.errorCorrection.length;
  const order: BitPosition[] = [];

  for (let cwIdx = 0; cwIdx < block.data.length; cwIdx++) {
    const codeword = block.data[cwIdx];
    if (!codeword?.bits) continue;
    
    // Add individual bits that come from editable segments
    // Don't require the entire codeword to be editable - individual bits can be controlled
    for (let bitInCw = 0; bitInCw < 8; bitInCw++) {
      const bit = codeword.bits[bitInCw];
      if (!bit?.id) continue;
      
      // Only include bits from editable segments (padding or QArt-append)
      // Exclude bits from last segments if specified (prevents invalid segment values)
      if (bit.sourceId && editableSegmentIds.has(bit.sourceId)) {
        if (excludeLastSegmentBits && excludeLastSegmentBits.has(bit.id)) {
          continue; // Skip bits from last segments to prevent invalid values
        }
        const bitIndex = cwIdx * 8 + bitInCw;
        const pos = getBitPosition(block, bitIndex, true, matrix, nd);
        if (pos) {
          // Mark if this bit is from an append segment for deterministic priority
          if (appendSegmentIds && bit.sourceId && appendSegmentIds.has(bit.sourceId)) {
            (pos as any).isAppendBit = true;
          }
          order.push(pos);
        }
      }
    }
  }

  // Add EC bits (can be controlled indirectly through data bits)
  // These are mixed with data bits and prioritized together based on image matching
  for (let i = 0; i < nc * 8; i++) {
    const pos = getBitPosition(block, i, false, matrix, nd);
    if (pos) order.push(pos);
  }

  return order;
}

/**
 * Build priority-ordered list of bits for a block from a per-module weight
 * grid (ConstraintSet.weightGrid semantics: raw, un-quantized weights such
 * as contrast × (1 − roi)). The legacy "contrast" and "roi" priority
 * branches both collapse into this single weight lookup; pass the literal
 * "random" for uniform random ordering ("random" stays a parameter because
 * it is not a property of the constraints).
 *
 * Priority per bit (preserved EXACTLY from the pre-split implementation):
 * - validity clamp: weight must be a finite number >= 0, else 0
 *   (out-of-bounds grid reads yield undefined and also clamp to 0)
 * - quantize to the nearest QUANTIZATION_STEP (= 50)
 * - floor and clamp to int32 (0x7FFFFFFF)
 * - sort descending with deterministic tie-break by bit index
 *
 * Precision decision: ConstraintSet.weightGrid is a Float32Array holding
 * the raw product validContrast * (1 − roi); the pre-split code computed
 * that product in float64 before quantizing. Float32 storage rounds the
 * product by at most half an ulp, which can only change the quantized
 * priority when the true product lies within that distance of a
 * quantization boundary (a multiple of QUANTIZATION_STEP / 2). The golden
 * suites (qart, isqr, pipeline) pass unchanged with float32, so we keep
 * the Float32Array representation; this function also accepts a
 * Float64Array so callers needing exact legacy precision (the legacy
 * buildBitOrder signature below) can pass float64 weights.
 */
export function buildBitOrderFromWeights(
  block: QRBlock,
  matrix: QRMatrix,
  dimension: number,
  editableSegmentIds: Set<string>, // Padding segments + QArt-append segments
  weights: Float32Array | Float64Array | "random",
  excludeLastSegmentBits?: Set<string>, // Bit IDs from last segments to exclude (prevents invalid values)
  appendSegmentIds?: Set<string> // QArt-append segment IDs for deterministic priority
): BitPosition[] {
  const order = collectControllableBits(
    block,
    matrix,
    editableSegmentIds,
    excludeLastSegmentBits,
    appendSegmentIds
  );

  // Calculate priority
  // IMPORTANT: EC bits need to be prioritized alongside data bits to ensure they can be controlled
  if (weights === "random") {
    // Random priority: uniform random ordering
    for (const po of order) {
      po.priority = Math.floor(Math.random() * 0xFFFFFFFF);
    }
  } else {
    for (const po of order) {
      const weight = weights[po.y * dimension + po.x];
      // Handle invalid values: out-of-bounds reads yield undefined, and
      // NaN/negative weights get priority 0 (lowest priority)
      const validWeight =
        typeof weight === "number" && isFinite(weight) && weight >= 0
          ? weight
          : 0;
      // Quantize aggressively to reduce sensitivity to small differences
      const quantized =
        Math.round(validWeight / QUANTIZATION_STEP) * QUANTIZATION_STEP;
      // Clamp to ensure it fits in 32-bit integer (though weights should be much smaller)
      po.priority = Math.min(Math.floor(quantized), 0x7FFFFFFF);
    }
  }

  // Sort by priority (higher first)
  // CRITICAL: When priorities are equal, use bit index as tie-breaker for deterministic ordering
  // This ensures consistent bit ordering even when multiple bits have the same contrast value
  order.sort((a, b) => {
    const priorityDiff = b.priority - a.priority;
    if (priorityDiff !== 0) return priorityDiff;
    // Tie-breaker: use bit index for deterministic ordering
    return a.bi - b.bi;
  });
  
  return order;
}

/**
 * Build priority-ordered list of bits for a block (legacy grid signature).
 *
 * Computes the per-module weight in float64 exactly as the pre-split
 * branches did, then delegates to buildBitOrderFromWeights:
 * - "contrast": weight = valid contrast (roiGrid is IGNORED, matching the
 *   classic QArt / Go implementation which uses contrast directly)
 * - "roi": weight = valid contrast × (1 − roi clamped to [0,1]), so IS-QR
 *   instance regions stay image-owned
 * - "random": uniform random ordering
 *
 * @param priorityType - Priority function type: "contrast" (prioritizes high-contrast regions to match image details) or "random" (uniform distribution)
 * @param roiGrid - Optional per-module ROI fraction [0,1]; required for "roi" priority
 */
export function buildBitOrder(
  block: QRBlock,
  matrix: QRMatrix,
  _targetGrid: Float32Array, // Kept for API compatibility, but contrastGrid is used for priority
  contrastGrid: Float32Array, // Pre-computed local variance (contrast) for each module
  dimension: number,
  editableSegmentIds: Set<string>, // Padding segments + QArt-append segments
  priorityType: PriorityFunctionType = "contrast",
  excludeLastSegmentBits?: Set<string>, // Bit IDs from last segments to exclude (prevents invalid values)
  appendSegmentIds?: Set<string>, // QArt-append segment IDs for deterministic priority
  roiGrid?: Float32Array // Per-module ROI [0,1] for IS-QR
): BitPosition[] {
  if (priorityType === "random") {
    return buildBitOrderFromWeights(
      block,
      matrix,
      dimension,
      editableSegmentIds,
      "random",
      excludeLastSegmentBits,
      appendSegmentIds
    );
  }

  // Float64Array preserves the exact pre-split float64 weight computation
  // for direct callers of this legacy signature.
  const size = dimension * dimension;
  const weights = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const contrast = contrastGrid[i];
    const validContrast =
      typeof contrast === "number" && isFinite(contrast) && contrast >= 0
        ? contrast
        : 0;
    if (priorityType === "roi") {
      // IS-QR: prioritize background modules (low ROI) × contrast so Gauss–Jordan
      // matching owns the silhouette; instance ROI modules are deprioritized.
      const roi =
        roiGrid && typeof roiGrid[i] === "number"
          ? Math.max(0, Math.min(1, roiGrid[i]))
          : 0;
      weights[i] = validContrast * (1 - roi);
    } else {
      // Contrast-based priority: prioritizes HIGH-contrast regions (matches
      // Go implementation, which uses the contrast value directly).
      weights[i] = validContrast;
    }
  }

  return buildBitOrderFromWeights(
    block,
    matrix,
    dimension,
    editableSegmentIds,
    weights,
    excludeLastSegmentBits,
    appendSegmentIds
  );
}

