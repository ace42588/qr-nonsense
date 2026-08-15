/**
 * QArt-style QR code generation
 * 
 * Implements the QArt algorithm from Russ Cox's research:
 * https://research.swtch.com/qart
 * 
 * The key insight: Reed-Solomon encoding is systematic and closed under XOR,
 * allowing us to build a basis matrix to control which modules we can set
 * while maintaining valid QR code structure.
 */

import { Segment, QRMatrix, Codeword, VersionInfo, Bit } from "../shared/types";
import { getCodewords } from "../qr";
import { validateDecode } from "@/adapters/browser/validation";
import { getMatrix } from "../qr/matrix";
import { interleave } from "../qr/codewords/utils";
import { computeVisualError, rasterizeImageToQRGrid, computeContrastGrid } from "../image";
import { QRBlock } from "../qr/codewords/blocks";
import { buildBitOrder, PriorityFunctionType } from "./bitPriority";
import { optimizeBlock } from "./blockOptimizer";
import { createControlMatrix } from "./controlMatrix";
import { ReedSolomonEncoder } from "../qr/reedsolomon";
import { codewordsToBytes } from "./codewordConversion";
import { appendDataToSegments } from "./appendData";
import { addFill, addPadding, addTerminator, getNumBits } from "../qr/encoders/utils";
import { updateCharCountIndicatorLengths } from "../qr/charCount";
import { updateSegmentTextFromCodewords, decodeSegmentValue } from "./decodeSegments";

export interface QArtAppendData {
  enabled: boolean;
  method: "existing" | "new"; // default: "existing"
  separator?: string; // Optional separator for both "existing" and "new" methods
  encodingMode?: "numeric" | "alphanumeric" | "byte"; // Required when method === "new"
}

export interface QArtOptimizedAppendData {
  segments: Segment[]; // The optimized append segments
  originalText: string; // The decoded text from optimized segments
  encodingMode: string; // The encoding mode used
}

export interface QArtOptions {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  initialMatrix: QRMatrix;
  versionInfo: VersionInfo;
  errorCorrectionLevel: number;
  targetImage: ImageData; // Deprecated: use sourceImage + transformParams instead
  signal?: AbortSignal; // For cancellation support (FR-021)
  priorityFunction?: PriorityFunctionType; // Priority function type (FR-007)
  appendData?: QArtAppendData; // Optional data to append before QArt optimization
  // Source image and transform parameters for offscreen canvas (QR dimension-based)
  sourceImage?: HTMLImageElement; // Source image (not transformed)
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  /** Minimum decode success rate before a scannability warning (default: 0.8) */
  minDecodeRedundancy?: number;
  /** Number of decode trials for verification (default: 1) */
  decodeTrials?: number;
}

export interface QArtResult {
  matrix: QRMatrix;
  dataMask: number;
  segments: Segment[];
  error: number;
  decodeSuccessRate: number;
  iterations: number;
  controlMatrix?: QRMatrix;
  contrastGrid?: Float32Array; // Pre-computed contrast (variance) map for visualization
  optimizedAppendData?: QArtOptimizedAppendData; // Optimized append data (if append was enabled)
  offscreenCanvasImage?: ImageData; // Offscreen canvas image (QR dimension-based) for rasterized preview and halftone
  scannabilityWarning?: string | null;
}

/**
 * Deep copy a block to avoid mutating the original
 * This ensures that modifying blocks during optimization doesn't affect
 * the input blocks that may be reused in the UI.
 */
function deepCopyBlock(block: QRBlock): QRBlock {
  const copyCodeword = (codeword: Codeword): Codeword => {
    const copiedBits: Bit[] = codeword.bits.map(bit => ({
      ...bit,
      value: bit.value, // Copy the value
    }));
    return {
      ...codeword,
      bits: copiedBits,
    };
  };

  return {
    data: block.data.map(copyCodeword),
    errorCorrection: block.errorCorrection.map(copyCodeword),
  };
}

/**
 * Generate QArt QR code
 * 
 * The algorithm directly optimizes bits using per-block Reed-Solomon basis matrices
 * to match the target image while maintaining QR spec correctness.
 */
export async function generateQArt(options: QArtOptions): Promise<QArtResult> {
  const {
    segments: originalSegments,
    codewords: _originalCodewords,
    blocks: qrBlocks,
    initialMatrix,
    versionInfo,
    errorCorrectionLevel,
    targetImage,
    signal,
    priorityFunction = "contrast", // Default to contrast-based priority (FR-007)
    appendData,
    sourceImage,
    transformParams,
    minDecodeRedundancy = 0.8,
    decodeTrials = 1,
  } = options;
  
  // Check for cancellation before starting (FR-021)
  if (signal?.aborted) {
    throw new Error("QArt generation was cancelled");
  }
  
  const { version: finalVersion, ecCodewordsPerBlock } = versionInfo;
  const dimension = finalVersion * 4 + 17;
  const maskIndex = 0; // QArt uses mask 0 (FR-008)
  
  // Cache Reed-Solomon encoder for reuse across all blocks
  // This avoids recreating the encoder (and its GenericGF field) for each block
  const cachedEncoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  
  // Apply data append if enabled
  let segments = originalSegments;
  let workingBlocks = qrBlocks;
  let codewords = _originalCodewords;
  let matrixForBitLookup = initialMatrix; // Matrix used for bit position lookups
  
  if (appendData?.enabled) {
    try {
      // Remove padding, terminator, and fill segments to prepare for re-encoding
      const dataSegmentsOnly = segments.filter(
        s => s.type !== "padding" && s.type !== "terminator" && s.type !== "fill"
      );
      
      // Edge case: If no data segments exist, skip appending
      if (dataSegmentsOnly.length === 0) {
        throw new Error("No data segments found. Cannot append data.");
      }
      
      // Append data to segments
      const segmentsWithAppended = updateCharCountIndicatorLengths(
        appendDataToSegments(
          dataSegmentsOnly,
          appendData,
          versionInfo
        ),
        versionInfo.version
      );
      
      // Edge case: Check if appended segments exceed capacity
      const { requiredDataCodewords } = versionInfo;
      const capacityBits = requiredDataCodewords * 8;
      const appendedBits = getNumBits(segmentsWithAppended);
      
      if (appendedBits > capacityBits) {
        throw new Error(`Appended data length exceeds QR code capacity. Current: ${appendedBits} bits, Capacity: ${capacityBits} bits. Try using a larger QR version or reducing the append length.`);
      }
      
      // Re-finalize encoding (add terminator, fill, padding)
      const finalizedSegments = addPadding(
        addFill(
          addTerminator(segmentsWithAppended, requiredDataCodewords),
          requiredDataCodewords
        ),
        requiredDataCodewords
      );
      
      segments = finalizedSegments;
      
      // Recreate codewords and blocks from modified segments
      // CRITICAL: getCodewords mutates segments to add bitIds and generates full codeword set (data + EC)
      const codewordsResult = getCodewords(segments, versionInfo.version, errorCorrectionLevel);
      codewords = codewordsResult.codewords;
      workingBlocks = codewordsResult.blocks;
      
      // CRITICAL: Regenerate initial matrix from new codewords
      // The old initialMatrix was created from old codewords and won't match the new bit structure
      // getMatrix needs the full codeword array (data + EC interleaved)
      const allCodewords = [...codewords];
      const { matrix: newInitialMatrix } = getMatrix(allCodewords, maskIndex, versionInfo.version, errorCorrectionLevel);
      matrixForBitLookup = newInitialMatrix;
    } catch (err) {
      // If append fails, throw error with clear message
      throw new Error(`Failed to append data: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // Create deep copies of blocks to avoid mutating the input
    workingBlocks = qrBlocks.map(deepCopyBlock);
  }
  
  // Identify editable bits (padding segments and QArt-append segments)
  // Both types can be optimized by QArt
  const paddingSegments = segments.filter(s => s.type === "padding");
  const appendSegments = segments.filter(s => s.type === "qartAppend");
  const editableSegmentIds = new Set([
    ...paddingSegments.map(s => s.id),
    ...appendSegments.map(s => s.id)
  ]);
  // Create set of append segment IDs for deterministic priority assignment
  const appendSegmentIds = new Set(appendSegments.map(s => s.id));
  
  if (editableSegmentIds.size === 0) {
    throw new Error("No editable segments found. QArt requires padding segments or appended data to optimize. Try adding more data, using a larger QR version, or enabling append data.");
  }
  
  // Note: We no longer exclude last segments. Instead, we allow QArt to optimize all segments
  // and clamp invalid values after optimization, then recalculate EC codewords.
  // This restores the QArt effect while ensuring valid QR codes.
  const excludeLastSegmentBits = new Set<string>();
  
  // Ensure matrixForBitLookup has getModuleByBitId method for bit lookups
  if (!matrixForBitLookup.getModuleByBitId) {
    throw new Error("Initial matrix does not have getModuleByBitId method. This is required for QArt optimization.");
  }
  
  // CRITICAL: Create offscreen canvas based on QR dimension (not window size)
  // All domain calculations (targetGrid, contrastGrid) must be based on this
  // invariant canvas size, completely decoupled from the visible canvas size.
  // The visible canvas is just a view that scales/translates from this offscreen canvas.
  const SCALE_FACTOR = 27; // Constant factor to ensure sufficient resolution
  const offscreenCanvasSize = dimension * SCALE_FACTOR;
  
  let normalizedTargetImage: ImageData;
  
  // If source image and transform params are provided, use them to create offscreen canvas
  // Otherwise, fall back to targetImage (for backward compatibility)
  if (sourceImage && transformParams) {
    // Transform source image to offscreen canvas (QR dimension-based)
    // CRITICAL: The scale parameter was calculated for a reference canvas size (480px)
    // We need to adjust the scale proportionally to maintain the same relative image size
    // on the offscreen canvas (dimension * SCALE_FACTOR)
    const { transformImageToCanvas } = await import("@/adapters/browser/image");
    const { convertTransparencyToWhite } = await import("@/domain/image");
    
    // Reference canvas size that the scale was calculated for
    const REFERENCE_CANVAS_SIZE = 480;
    
    // Adjust scale proportionally: if scale was calculated for 480px canvas,
    // and we're using a 999px canvas, multiply by (999/480) to maintain same relative size
    const scaleRatio = offscreenCanvasSize / REFERENCE_CANVAS_SIZE;
    const adjustedScale = transformParams.scale * scaleRatio;
    
    // Adjust offsets proportionally as well
    const adjustedOffsetX = transformParams.offsetX * scaleRatio;
    const adjustedOffsetY = transformParams.offsetY * scaleRatio;
    
    const transformed = await transformImageToCanvas(
      sourceImage,
      offscreenCanvasSize,
      adjustedScale,
      adjustedOffsetX,
      adjustedOffsetY
    );
    
    // Convert transparency to white background
    normalizedTargetImage = convertTransparencyToWhite(transformed);
    
  } else {
    // Fallback: normalize targetImage to offscreen canvas size
    // This is less ideal but maintains backward compatibility
    normalizedTargetImage = targetImage;
    
    if (targetImage.width !== offscreenCanvasSize || targetImage.height !== offscreenCanvasSize) {
      const canvas = document.createElement("canvas");
      canvas.width = offscreenCanvasSize;
      canvas.height = offscreenCanvasSize;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, offscreenCanvasSize, offscreenCanvasSize);
        
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetImage.width;
        tempCanvas.height = targetImage.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.putImageData(targetImage, 0, 0);
          
          const sourceAspect = targetImage.width / targetImage.height;
          let drawWidth = offscreenCanvasSize;
          let drawHeight = offscreenCanvasSize;
          let drawX = 0;
          let drawY = 0;
          
          if (sourceAspect > 1) {
            drawHeight = offscreenCanvasSize / sourceAspect;
            drawY = (offscreenCanvasSize - drawHeight) / 2;
          } else {
            drawWidth = offscreenCanvasSize * sourceAspect;
            drawX = (offscreenCanvasSize - drawWidth) / 2;
          }
          
          ctx.drawImage(
            tempCanvas,
            0, 0, targetImage.width, targetImage.height,
            drawX, drawY, drawWidth, drawHeight
          );
          normalizedTargetImage = ctx.getImageData(0, 0, offscreenCanvasSize, offscreenCanvasSize);
        }
      }
    }
    
  }
  
  
  const targetGrid = rasterizeImageToQRGrid(normalizedTargetImage, dimension);
  
  // Compute contrast grid (local variance) for each module position efficiently
  // Uses optimized function that pre-scales values and avoids redundant calculations
  const contrastGrid = computeContrastGrid(targetGrid, dimension, 5);
  
  
  
  // Track which modules were successfully controlled
  const controlledBits = new Map<string, boolean>();
  
  let totalBitsOptimized = 0;
  
  // Build a map of which data codewords are entirely editable (padding or QArt-append)
  // This helps us verify that basis vector modifications don't affect user data
  const buildEditableCodewordSet = (block: QRBlock): Set<number> => {
    const editableCodewordIndices = new Set<number>();
    for (let cwIdx = 0; cwIdx < block.data.length; cwIdx++) {
      const codeword = block.data[cwIdx];
      if (codeword?.bits && codeword.bits.every(bit => bit?.sourceId && editableSegmentIds.has(bit.sourceId))) {
        editableCodewordIndices.add(cwIdx);
      }
    }
    return editableCodewordIndices;
  };
  
  // Process each block independently (FR-025)
  for (let blockNum = 0; blockNum < workingBlocks.length; blockNum++) {
    // Check for cancellation during processing (FR-021)
    if (signal?.aborted) {
      throw new Error("QArt generation was cancelled");
    }

    const block = workingBlocks[blockNum];
    const editableCodewordIndices = buildEditableCodewordSet(block);
    
    // Build priority-ordered list of bits for this block
    const bitOrder = buildBitOrder(
      block,
      matrixForBitLookup, // Use regenerated matrix if append was enabled
      targetGrid,
      contrastGrid, // Pass contrast grid for priority calculation
      dimension,
      editableSegmentIds, // Pass editable segment IDs (padding + append)
      priorityFunction, // Pass priority function type (FR-007)
      excludeLastSegmentBits, // Exclude bits from last segments to prevent invalid values
      appendSegmentIds // Pass append segment IDs for deterministic priority
    );
    
    
    if (bitOrder.length === 0) {
      continue;
    }
    
    // Optimize block to match target image
    // Pass editable codeword indices to prevent modifying user data bytes
    // Pass cached encoder to avoid recreating it for each block
    // Pass append segment IDs to ensure deterministic optimization for appended data
    const stats = optimizeBlock(
      block,
      bitOrder,
      targetGrid,
      dimension,
      ecCodewordsPerBlock,
      editableCodewordIndices, // Pass editable codeword indices for safety checks
      cachedEncoder // Reuse cached encoder for performance
    );
    
    totalBitsOptimized += stats.optimized;
    
    // Merge controlled bits tracking (FR-011)
    for (const [bitId, wasControlled] of stats.controlledBits) {
      controlledBits.set(bitId, wasControlled);
    }
  }
  
  if (totalBitsOptimized === 0) {
    throw new Error("QArt optimization completed but no bits were modified. This may indicate insufficient padding capacity or a bug in the optimization algorithm.");
  }
  
  // Verify Reed-Solomon correctness for each block before rebuilding
  // This helps catch issues early
  // Use cached encoder instead of creating new one for each block
  let allECCorrect = true;
  for (let i = 0; i < workingBlocks.length; i++) {
    const block = workingBlocks[i];
    const { dataBytes, ecBytes: actualEC } = codewordsToBytes(block);
    const expectedEC = cachedEncoder.encode(dataBytes);
    
    // Check if EC bytes match (they should if Reed-Solomon is correct)
    let ecMatches = true;
    const mismatches: number[] = [];
    for (let j = 0; j < expectedEC.length; j++) {
      if (expectedEC[j] !== actualEC[j]) {
        ecMatches = false;
        mismatches.push(j);
      }
    }
    
    if (!ecMatches) {
      allECCorrect = false;
    }
  }
  
  if (!allECCorrect) {
    throw new Error("Reed-Solomon encoding verification failed. QArt optimization may have corrupted the QR code.");
  }
  
  
  // Rebuild codewords from modified blocks
  // CRITICAL: Always rebuild from workingBlocks after QArt optimization
  // When append mode is disabled, workingBlocks are deep copies, so we MUST rebuild
  // When append mode is enabled, workingBlocks share objects with codewords, but we still rebuild
  // to ensure the exact order matches what getCodewords would return
  // Use the same interleaving order as generateCodewords
  // generateCodewords does: [...interleave(blocks.map(b => b.data)), ...interleave(blocks.map(b => b.errorCorrection))]
  const modifiedDataCodewords = interleave(workingBlocks.map(b => b.data));
  const modifiedECCodewords = interleave(workingBlocks.map(b => b.errorCorrection));
  const finalCodewords = [...modifiedDataCodewords, ...modifiedECCodewords];
  
  
  // Update segment text properties from optimized codewords
  // This ensures segments reflect the optimized values, not the original placeholder values
  // Update both padding segments (always optimized) and qartAppend segments (if append enabled)
  let updatedSegments = segments;
  
  // Always update padding segments (they're always optimized by QArt)
  // Padding segments are byte segments (values 236 and 17)
  // Pass all segments - updateSegmentTextFromCodewords will only process padding segments when mode="byte"
  const paddingUpdate = updateSegmentTextFromCodewords(updatedSegments, finalCodewords, "byte");
  updatedSegments = paddingUpdate.segments;
  
  // Update append segments if append is enabled
  if (appendData?.enabled) {
    // Find all append segments and their encoding modes
    const appendSegs = segments.filter(s => s.type === "qartAppend");
    if (appendSegs.length > 0) {
      // Find the mode indicator for append segments
      // Append segments are in a group with a mode indicator before them
      let appendMode: string | null = null;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === "modeIndicator") {
          // Check if the next segments include append segments
          let foundAppend = false;
          let j = i + 1;
          while (j < segments.length && segments[j].type !== "modeIndicator" && segments[j].type !== "terminator" && segments[j].type !== "fill" && segments[j].type !== "padding") {
            if (segments[j].type === "qartAppend") {
              foundAppend = true;
              break;
            }
            j++;
          }
          
          if (foundAppend) {
            const modeBits = segments[i].value;
            if (modeBits === 0x1) appendMode = "numeric";
            else if (modeBits === 0x2) appendMode = "alphanumeric";
            else if (modeBits === 0x4) appendMode = "byte";
            break;
          }
        }
      }
      
      if (appendMode) {
        // Update segments with decoded text from optimized codewords
        // Only update append segments and data segments in the same group
        
        // Only process qartAppend segments here (not padding, which was already processed)
        // updateSegmentTextFromCodewords will filter internally, but we want to ensure
        // qartAppend segments are only processed once with their correct mode
        const appendUpdate = updateSegmentTextFromCodewords(updatedSegments, finalCodewords, appendMode);
        updatedSegments = appendUpdate.segments;
        
        // Always verify and update the character count indicator to match actual decoded character count
        // This is necessary because QArt optimization can change segment values, which changes character counts
        if (appendMode === "numeric" || appendMode === "alphanumeric") {
          // Find the character count indicator for this append group
          let charCountIndicator: any = null;
          let charCountIndicatorIndex = -1;
          for (let i = 0; i < updatedSegments.length; i++) {
            if (updatedSegments[i].type === "modeIndicator" && 
                ((appendMode === "numeric" && updatedSegments[i].value === 0x1) ||
                 (appendMode === "alphanumeric" && updatedSegments[i].value === 0x2))) {
              if (i + 1 < updatedSegments.length && updatedSegments[i + 1].type === "characterCountIndicator") {
                charCountIndicator = updatedSegments[i + 1];
                charCountIndicatorIndex = i + 1;
                break;
              }
            }
          }
          if (charCountIndicator && charCountIndicator.bitIds && charCountIndicator.bitIds.length > 0) {
            // Calculate total decoded character count
            let appendGroupStart = -1;
            let appendGroupEnd = -1;
            for (let i = 0; i < updatedSegments.length; i++) {
              if (updatedSegments[i].type === "modeIndicator" && 
                  ((appendMode === "numeric" && updatedSegments[i].value === 0x1) ||
                   (appendMode === "alphanumeric" && updatedSegments[i].value === 0x2))) {
                appendGroupStart = i;
                for (let j = i + 2; j < updatedSegments.length; j++) {
                  if (updatedSegments[j].type === "modeIndicator" || 
                      updatedSegments[j].type === "terminator" || 
                      updatedSegments[j].type === "fill" || 
                      updatedSegments[j].type === "padding") {
                    appendGroupEnd = j;
                    break;
                  }
                }
                if (appendGroupEnd === -1) appendGroupEnd = updatedSegments.length;
                break;
              }
            }
            const appendGroupDataSegments = updatedSegments.slice(appendGroupStart + 2, appendGroupEnd).filter(s => s.type === "data" || s.type === "qartAppend");
            const totalDecodedChars = appendGroupDataSegments.reduce((sum, s) => {
              const text = (s as any).text;
              if (text) return sum + text.length;
              if (s.type === "data") {
                const decoded = decodeSegmentValue(s, appendMode);
                return sum + decoded.length;
              }
              return sum;
            }, 0);
            // Verify character count indicator bits in codewords match the segment value
            // Build bitToCodewordMap to read actual bits from codewords
            const bitToCodewordMap = new Map<string, { codewordIndex: number; bitIndex: number }>();
            finalCodewords.forEach((codeword, cwIdx) => {
              if (codeword.bits) {
                codeword.bits.forEach((bit: any, bitIdx: number) => {
                  if (bit && bit.id) {
                    bitToCodewordMap.set(bit.id, { codewordIndex: cwIdx, bitIndex: bitIdx });
                  }
                });
              }
            });
            // Read actual bits from codewords for character count indicator
            let actualCharCountFromBits = 0;
            if (charCountIndicator.bitIds && charCountIndicator.bitIds.length > 0) {
              const bitValues: number[] = [];
              for (const bitId of charCountIndicator.bitIds) {
                const mapping = bitToCodewordMap.get(bitId);
                if (mapping) {
                  const codeword = finalCodewords[mapping.codewordIndex];
                  if (codeword && codeword.bits && codeword.bits[mapping.bitIndex]) {
                    bitValues.push(codeword.bits[mapping.bitIndex].value);
                  }
                }
              }
              if (bitValues.length === charCountIndicator.length) {
                for (let i = 0; i < bitValues.length; i++) {
                  actualCharCountFromBits = (actualCharCountFromBits << 1) | bitValues[i];
                }
              }
            }
            // Update character count indicator if segment value changed OR if bits don't match
            if (charCountIndicator.value !== totalDecodedChars || actualCharCountFromBits !== totalDecodedChars) {
              // Update character count indicator segment value
              updatedSegments[charCountIndicatorIndex] = {
                ...charCountIndicator,
                value: totalDecodedChars
              };
              // Update character count indicator bits in codewords
              const newCharCountBits: number[] = [];
              let val = totalDecodedChars;
              for (let i = charCountIndicator.length - 1; i >= 0; i--) {
                newCharCountBits[i] = val & 1;
                val >>= 1;
              }
              for (let i = 0; i < charCountIndicator.bitIds.length; i++) {
                const bitId = charCountIndicator.bitIds[i];
                const mapping = bitToCodewordMap.get(bitId);
                if (mapping) {
                  const codeword = finalCodewords[mapping.codewordIndex];
                  if (codeword && codeword.bits && codeword.bits[mapping.bitIndex]) {
                    codeword.bits[mapping.bitIndex].value = newCharCountBits[i];
                  }
                }
              }
              // Mark that we need to recalculate EC codewords since we updated the character count indicator
              appendUpdate.bitsWereClamped = true;
            }
          }
        }
        
        // CRITICAL: Only recalculate EC codewords if bits were actually changed
        // (clamping or character count indicator update)
        // QArt optimization already produced correct EC codewords, so we should only recalculate
        // when updateSegmentTextFromCodewords modifies bits
        // Since codeword objects are shared between finalCodewords and blocks, bits are already updated in blocks
        // We just need to recalculate EC codewords based on the modified data bytes
        if (appendUpdate.bitsWereClamped) {
          for (let blockIdx = 0; blockIdx < workingBlocks.length; blockIdx++) {
            const block = workingBlocks[blockIdx];
            // Recalculate EC codewords from modified data bytes
            const { dataBytes } = codewordsToBytes(block);
            const newECBytes = cachedEncoder.encode(dataBytes);
            
            // Verify that new EC bytes match existing EC bytes (they should if no bits changed)
            const { ecBytes: existingECBytes } = codewordsToBytes(block);
            let ecBytesMatch = true;
            for (let i = 0; i < newECBytes.length; i++) {
              if (newECBytes[i] !== existingECBytes[i]) {
                ecBytesMatch = false;
                break;
              }
            }
            
            
            // Only update EC codeword bits if they actually changed
            // This avoids unnecessary bit updates when EC bytes match (no bits changed)
            if (!ecBytesMatch) {
              // Update EC codeword bits from new EC bytes
              for (let i = 0; i < newECBytes.length; i++) {
                const byte = newECBytes[i];
                for (let bit = 0; bit < 8; bit++) {
                  block.errorCorrection[i].bits[bit].value = (byte >> (7 - bit)) & 1;
                }
              }
            }
          }
          
          // After EC recalculation, codeword objects in workingBlocks have been updated
          // Rebuild finalCodewords from workingBlocks to ensure we have the updated codewords
          // This preserves the exact order returned by getCodewords
          const updatedDataCodewords = interleave(workingBlocks.map(b => b.data));
          const updatedECCodewords = interleave(workingBlocks.map(b => b.errorCorrection));
          // Update finalCodewords array contents (preserve reference for logging)
          finalCodewords.length = 0;
          finalCodewords.push(...updatedDataCodewords, ...updatedECCodewords);
        }
        
        
      }
    }
  }
  
  // Generate final matrix
  const { matrix, dataMask: usedMask } = getMatrix(
    finalCodewords,
    maskIndex,
    finalVersion,
    errorCorrectionLevel
  );
  
  // Verify mask matches what we expect
  if (usedMask !== maskIndex) {
    throw new Error(`QArt requested mask ${maskIndex} but got mask ${usedMask} from getMatrix`);
  }
  
  // Check for cancellation before validation (FR-021)
  if (signal?.aborted) {
    throw new Error("QArt generation was cancelled");
  }
  
  
  // Validate decode (FR-009). Prefer a warning over throwing so generation still shows (T10).
  const trials = Number.isFinite(decodeTrials) && decodeTrials > 0 ? decodeTrials : 1;
  const threshold =
    Number.isFinite(minDecodeRedundancy) && minDecodeRedundancy >= 0 && minDecodeRedundancy <= 1
      ? minDecodeRedundancy
      : 0.8;
  const decodeSuccessRate = await validateDecode(matrix, trials);

  // Check for cancellation after validation (FR-021)
  if (signal?.aborted) {
    throw new Error("QArt generation was cancelled");
  }

  const scannabilityWarning =
    decodeSuccessRate < threshold
      ? `Decode success rate ${(decodeSuccessRate * 100).toFixed(0)}% is below the ${(threshold * 100).toFixed(0)}% threshold. The QR code may not scan reliably.`
      : null;
  
  // Compute visual error
  const error = computeVisualError(matrix, targetGrid, dimension);
  
  // Create control visualization matrix (FR-012)
  const controlMatrix = createControlMatrix(matrix, controlledBits);
  
  // Extract optimized append data if append was enabled
  let optimizedAppendData: QArtOptimizedAppendData | undefined;
  if (appendData?.enabled) {
    const appendSegments = segments.filter(s => s.type === "qartAppend");
    if (appendSegments.length > 0) {
      // Find the segment group containing these append segments
      const appendSegmentIds = new Set(appendSegments.map(s => s.id));
      let appendGroupStart = -1;
      let appendGroupEnd = -1;
      let appendMode: string | null = null;
      
      // Find the mode indicator before the append segments
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === "modeIndicator") {
          // Check if this group contains append segments
          let j = i + 1;
          while (j < segments.length && segments[j].type !== "modeIndicator" && segments[j].type !== "terminator" && segments[j].type !== "fill" && segments[j].type !== "padding") {
            if (appendSegmentIds.has(segments[j].id)) {
              appendGroupStart = i;
              const modeBits = segments[i].value;
              if (modeBits === 0x1) appendMode = "numeric";
              else if (modeBits === 0x2) appendMode = "alphanumeric";
              else if (modeBits === 0x4) appendMode = "byte";
              break;
            }
            j++;
          }
          if (appendGroupStart !== -1) {
            // Find the end of this group
            appendGroupEnd = j;
            break;
          }
        }
      }
      
      if (appendGroupStart !== -1 && appendMode) {
        // Extract text from ONLY the qartAppend segments (not the entire group)
        // The append segments come after the original user data segments
        const appendTextSegments = updatedSegments.filter(s => s.type === "qartAppend");
        const appendText = extractTextFromAppendSegments(updatedSegments, appendGroupStart, appendGroupEnd, appendMode);
        
        
        optimizedAppendData = {
          segments: appendTextSegments,
          originalText: appendText,
          encodingMode: appendMode
        };
      }
    }
  }
  
  return {
    matrix,
    dataMask: usedMask,
    segments: updatedSegments, // Return updated segments with decoded text
    error,
    decodeSuccessRate,
    iterations: 1,
    controlMatrix, // Always include control matrix (FR-012)
    contrastGrid, // Include contrast grid for visualization
    optimizedAppendData,
    offscreenCanvasImage: normalizedTargetImage, // Include offscreen canvas for rasterized preview and halftone
    scannabilityWarning,
  };
}

/**
 * Extracts text from optimized append segments
 */
function extractTextFromAppendSegments(segments: Segment[], startIndex: number, endIndex: number, mode: string): string {
  // Only get segments marked as qartAppend (these are the appended portions, not original user data)
  console.debug(segments, startIndex, endIndex, mode);
  const appendSegments = segments.filter(s => s.type === "qartAppend");
  
  if (appendSegments.length === 0) {
    console.debug('extractTextFromAppendSegments', 'No append segments found');
    return "";
  }
  
  // Segment.text exists at runtime but isn't in the type definition
  // Use type assertion to access it safely
  type SegmentWithText = Segment & { text?: string };
  
  const getSegmentText = (s: Segment): string => {
    const segWithText = s as SegmentWithText;
    // If text is empty or missing, try to decode from value
    if (!segWithText.text || segWithText.text.trim() === "") {
      return decodeSegmentValue(s, mode);
    }
    return segWithText.text || "";
  };
  
  // Extract text from all append segments
  const texts = appendSegments.map(getSegmentText);
  return texts.join("");
}
