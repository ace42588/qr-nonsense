/**
 * Bit priority calculation and ordering for QArt optimization
 */

import { QRBlock } from "../qr/codewords/blocks";
import { QRMatrix } from "@/types";

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
 * @param priorityType - Priority function type: "contrast" (prioritizes low-contrast regions) or "random" (uniform distribution)
 */
export function buildBitOrder(
  block: QRBlock,
  matrix: QRMatrix,
  targetGrid: Float32Array,
  dimension: number,
  editableSegmentIds: Set<string>, // Padding segments + QArt-append segments
  priorityType: PriorityFunctionType = "contrast"
): BitPosition[] {
  const nd = block.data.length;
  const nc = block.errorCorrection.length;
  const order: BitPosition[] = [];

  // Collect all controllable bits (data + EC) together for unified prioritization
  // CRITICAL: Only modify codewords that are ENTIRELY editable (all 8 bits from padding or QArt-append segments)
  // Modifying codewords that contain user data bits will corrupt the user data
  for (let cwIdx = 0; cwIdx < block.data.length; cwIdx++) {
    const codeword = block.data[cwIdx];
    if (!codeword?.bits) continue;
    
    // Check if ALL bits in this codeword are from editable segments (padding or QArt-append)
    const allBitsAreEditable = codeword.bits.every(bit => 
      bit?.sourceId && editableSegmentIds.has(bit.sourceId)
    );
    
    if (!allBitsAreEditable) {
      // Skip this entire codeword - it contains user data bits
      continue;
    }
    
    // All bits are editable - add all 8 bits to the order
    for (let bitInCw = 0; bitInCw < 8; bitInCw++) {
      const bit = codeword.bits[bitInCw];
      if (!bit?.id) continue;
      
      const bitIndex = cwIdx * 8 + bitInCw;
      const pos = getBitPosition(block, bitIndex, true, matrix, nd);
      if (pos) order.push(pos);
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
    // Contrast-based priority: prioritizes low-contrast regions (contrast-based)
    // EC bits are given equal priority consideration to ensure they can be optimized
    for (const po of order) {
      const targetBrightness = targetGrid[po.y * dimension + po.x];
      // Contrast: distance from 0.5 (midpoint), normalized to 0-1
      // Lower contrast = higher priority (we want to prioritize low-contrast regions)
      const contrast = Math.abs(targetBrightness - 0.5) * 2; // 0-1 scale
      const contrastValue = Math.floor((1 - contrast) * 255); // Invert: low contrast = high priority
      const randomValue = Math.floor(Math.random() * 256); // Add randomness for tie-breaking
      // EC bits get same priority calculation - they'll be processed in second pass
      // but priority ensures they're ordered correctly within their pass
      po.priority = (contrastValue << 8) | randomValue;
    }
  }

  // Sort by priority (higher first)
  order.sort((a, b) => b.priority - a.priority);
  
  return order;
}

