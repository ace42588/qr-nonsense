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
 */
export type PriorityFunctionType = "contrast" | "random";

/**
 * Build priority-ordered list of bits for a block
 * 
 * @param priorityType - Priority function type: "contrast" (prioritizes high-contrast regions to match image details) or "random" (uniform distribution)
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
  appendSegmentIds?: Set<string> // QArt-append segment IDs for deterministic priority
): BitPosition[] {
  const nd = block.data.length;
  const nc = block.errorCorrection.length;
  const order: BitPosition[] = [];

  // Collect all controllable bits (data + EC) together for unified prioritization
  // CRITICAL: Include ALL data bits from editable segments (padding or QArt-append)
  // The basis matrix algorithm (setBlockBit) will check if a basis vector affects user data bytes
  // and reject it if necessary. We should include all editable bits and let setBlockBit decide.
  // This allows controlling individual bits even when they're in codewords that also contain user data.
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

  // Calculate priority based on priority function type
  // IMPORTANT: EC bits need to be prioritized alongside data bits to ensure they can be controlled
  if (priorityType === "random") {
    // Random priority: uniform random ordering
    for (const po of order) {
      po.priority = Math.floor(Math.random() * 0xFFFFFFFF);
    }
  } else {
    // Contrast-based priority: prioritizes HIGH-contrast regions (matches Go implementation)
    // Go implementation uses contrast (variance) value directly as priority
    // Higher contrast (edges, boundaries) = higher priority = controlled first
    // This preserves image details by controlling high-contrast areas to match the image
    // Variance is calculated on 0-255 scale, so values can be large (up to ~16000 for high contrast)
    // Match Go: use contrast value directly as priority, no random tie-breaking
    
    // EC bits are given equal priority consideration to ensure they can be optimized
    // All bits (padding, append, EC) use contrast-based priority for QArt effect
    const QUANTIZATION_STEP = 50; // Round contrast values to nearest 50 for stability
    for (const po of order) {
      const contrast = contrastGrid[po.y * dimension + po.x];
      // Use contrast value directly as priority (matches Go implementation exactly)
      // Go code: po.Priority = pinfo.Contrast (no encoding, no random)
      // Handle invalid values: ensure contrast is a valid finite number
      // Invalid/NaN values get priority 0 (lowest priority)
      const validContrast = (typeof contrast === 'number' && isFinite(contrast) && contrast >= 0) 
        ? contrast 
        : 0;
      // Quantize aggressively to reduce sensitivity to small differences
      const quantizedContrast = Math.round(validContrast / QUANTIZATION_STEP) * QUANTIZATION_STEP;
      // Clamp to ensure it fits in 32-bit integer (though contrast values should be much smaller)
      po.priority = Math.min(Math.floor(quantizedContrast), 0x7FFFFFFF);
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

