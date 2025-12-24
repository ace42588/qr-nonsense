/**
 * Block optimization logic for QArt
 */

import { QRBlock } from "../qr/codewords/blocks";
import { BitPosition } from "./bitPriority";
import { initBlockBasis, setBlockBit, applyBlockBasis } from "./basisMatrix";

export interface OptimizationStats {
  optimized: number;
  skipped: number;
  dataOptimized: number;
  ecOptimized: number;
  controlledBits: Map<string, boolean>;
}

/**
 * Optimize a single block to match target image
 * Uses multiple passes: first optimize data bits, then EC bits
 */
export function optimizeBlock(
  block: QRBlock,
  bitOrder: BitPosition[],
  targetGrid: Float32Array,
  dimension: number,
  ecCodewordsPerBlock: number,
  editableCodewordIndices?: Set<number> // Padding + QArt-append codewords that can be modified
): OptimizationStats {
  const basisState = initBlockBasis(block, ecCodewordsPerBlock);
  
  // Set editable byte indices for safety checks in setBlockBit
  if (editableCodewordIndices) {
    basisState.paddingByteIndices = editableCodewordIndices;
  }
  const nd = block.data.length;
  const stats: OptimizationStats = {
    optimized: 0,
    skipped: 0,
    dataOptimized: 0,
    ecOptimized: 0,
    controlledBits: new Map(),
  };

  // Mask 0 function: (x+y) % 2 === 0
  const mask0Func = (x: number, y: number) => (y + x) % 2 === 0;

  // Process all bits together in priority order
  // The basis matrix algorithm allows controlling both data and EC bits
  // EC bits are controlled indirectly through data bit flips
  // Processing in priority order ensures the most important bits (by image matching) are controlled first
  
  // Track which bits are being modified for debugging
  let dataBitsModified = 0;
  let ecBitsModified = 0;
  const modifiedBitIds = new Set<string>();
  
  // Track which priority ranges get controlled vs skipped
  const priorityRanges = {
    high: { controlled: 0, skipped: 0 }, // Top 25%
    mid: { controlled: 0, skipped: 0 },  // Middle 50%
    low: { controlled: 0, skipped: 0 },  // Bottom 25%
  };
  const totalBits = bitOrder.length;
  const highThreshold = totalBits > 0 ? bitOrder[Math.floor(totalBits * 0.25)].priority : 0;
  const lowThreshold = totalBits > 0 ? bitOrder[Math.floor(totalBits * 0.75)].priority : 0;
  
  for (const po of bitOrder) {
    const targetBrightness = targetGrid[po.y * dimension + po.x];
    const desiredIsDark = targetBrightness < 0.5;
    
    // Account for mask 0: isDark = mask0(x,y) ? !(bit.value === 1) : (bit.value === 1)
    const maskValue = mask0Func(po.x, po.y);
    const desiredBit = maskValue ? (desiredIsDark ? 0 : 1) : (desiredIsDark ? 1 : 0);
    
    const isDataBit = po.bi < nd * 8;
    const wasControlled = setBlockBit(basisState, po.bi, desiredBit);
    
    // Track priority ranges
    if (po.priority >= highThreshold) {
      if (wasControlled) priorityRanges.high.controlled++;
      else priorityRanges.high.skipped++;
    } else if (po.priority >= lowThreshold) {
      if (wasControlled) priorityRanges.mid.controlled++;
      else priorityRanges.mid.skipped++;
    } else {
      if (wasControlled) priorityRanges.low.controlled++;
      else priorityRanges.low.skipped++;
    }
    
    if (wasControlled) {
      stats.optimized++;
      if (isDataBit) {
        stats.dataOptimized++;
        dataBitsModified++;
        modifiedBitIds.add(po.bitId);
      } else {
        stats.ecOptimized++;
        ecBitsModified++;
      }
      stats.controlledBits.set(po.bitId, true);
    } else {
      stats.skipped++;
      stats.controlledBits.set(po.bitId, false);
    }
  }

  // Apply basis matrix changes back to block codewords
  applyBlockBasis(block, basisState);
  
  return stats;
}

