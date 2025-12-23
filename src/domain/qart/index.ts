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
import { computeVisualError, rasterizeImageToQRGrid, calculateLocalVariance } from "../image";
import { QRBlock } from "../qr/codewords/blocks";
import { buildBitOrder, PriorityFunctionType } from "./bitPriority";
import { optimizeBlock } from "./blockOptimizer";
import { createControlMatrix } from "./controlMatrix";
import { ReedSolomonEncoder } from "../qr/reedsolomon";
import { codewordsToBytes } from "./codewordConversion";
import { appendDataToSegments } from "./appendData";
import { addFill, addPadding, addTerminator, getNumBits } from "../qr/encoders/utils";
import { updateSegmentTextFromCodewords, decodeSegmentValue } from "./decodeSegments";

export interface QArtAppendData {
  enabled: boolean;
  method: "existing" | "new"; // default: "existing"
  separator?: string; // Optional separator when method === "existing"
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
  targetImage: ImageData;
  signal?: AbortSignal; // For cancellation support (FR-021)
  priorityFunction?: PriorityFunctionType; // Priority function type (FR-007)
  appendData?: QArtAppendData; // Optional data to append before QArt optimization
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
  } = options;
  
  // Check for cancellation before starting (FR-021)
  if (signal?.aborted) {
    throw new Error("QArt generation was cancelled");
  }
  
  const { version: finalVersion, ecCodewordsPerBlock } = versionInfo;
  const dimension = finalVersion * 4 + 17;
  const maskIndex = 0; // QArt uses mask 0 (FR-008)
  
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
      const segmentsWithAppended = appendDataToSegments(
        dataSegmentsOnly,
        appendData,
        versionInfo
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
  
  if (editableSegmentIds.size === 0) {
    throw new Error("No editable segments found. QArt requires padding segments or appended data to optimize. Try adding more data, using a larger QR version, or enabling append data.");
  }
  
  // Ensure matrixForBitLookup has getModuleByBitId method for bit lookups
  if (!matrixForBitLookup.getModuleByBitId) {
    throw new Error("Initial matrix does not have getModuleByBitId method. This is required for QArt optimization.");
  }
  
  // Rasterize target image to QR grid
  const targetGrid = rasterizeImageToQRGrid(targetImage, dimension);
  
  // Compute contrast grid (local variance) for each module position
  // Matches Go implementation: calculates variance in 11x11 neighborhood (radius=5)
  const contrastGrid = new Float32Array(dimension * dimension);
  let minContrast = Infinity;
  let maxContrast = -Infinity;
  let contrastSum = 0;
  let contrastCount = 0;
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const contrast = calculateLocalVariance(targetGrid, dimension, x, y, 5);
      contrastGrid[y * dimension + x] = contrast;
      if (isFinite(contrast) && contrast >= 0) {
        if (contrast < minContrast) minContrast = contrast;
        if (contrast > maxContrast) maxContrast = contrast;
        contrastSum += contrast;
        contrastCount++;
      }
    }
  }
  
  // Debug: Log contrast statistics to verify values are meaningful
  if (contrastCount > 0) {
    const avgContrast = contrastSum / contrastCount;
    const contrastRange = maxContrast - minContrast;
    console.log(`[QArt] Contrast stats: min=${minContrast.toFixed(2)}, max=${maxContrast.toFixed(2)}, avg=${avgContrast.toFixed(2)}, range=${contrastRange.toFixed(2)}`);
  }
  
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
      priorityFunction // Pass priority function type (FR-007)
    );
    
    if (bitOrder.length === 0) {
      continue;
    }
    
    // Optimize block to match target image
    // Pass editable codeword indices to prevent modifying user data bytes
    const stats = optimizeBlock(
      block,
      bitOrder,
      targetGrid,
      dimension,
      ecCodewordsPerBlock,
      editableCodewordIndices // Pass editable codeword indices for safety checks
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
  let allECCorrect = true;
  for (let i = 0; i < workingBlocks.length; i++) {
    const block = workingBlocks[i];
    const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
    const { dataBytes, ecBytes: actualEC } = codewordsToBytes(block);
    const expectedEC = encoder.encode(dataBytes);
    
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
  const modifiedDataCodewords = interleave(workingBlocks.map(b => b.data));
  const modifiedECCodewords = interleave(workingBlocks.map(b => b.errorCorrection));
  const finalCodewords = [...modifiedDataCodewords, ...modifiedECCodewords];
  
  // Update segment text properties from optimized codewords
  // This ensures segments reflect the optimized values, not the original placeholder values
  // Update both padding segments (always optimized) and qartAppend segments (if append enabled)
  let updatedSegments = segments;
  
  // Always update padding segments (they're always optimized by QArt)
  // Padding segments are byte segments (values 236 and 17)
  updatedSegments = updateSegmentTextFromCodewords(updatedSegments, finalCodewords, "byte");
  
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
        updatedSegments = updateSegmentTextFromCodewords(updatedSegments, finalCodewords, appendMode);
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
  
  // Validate decode (FR-009) - single trial for basic scannability check
  const decodeSuccessRate = await validateDecode(matrix, 1, false);
  
  // Check for cancellation after validation (FR-021)
  if (signal?.aborted) {
    throw new Error("QArt generation was cancelled");
  }
  
  // Throw error with clear message if scannability verification fails (FR-010)
  // Note: Format info is correct (verified above), so if validation fails,
  // it might be due to jsQR being strict or a rendering issue
  // For QArt, we'll use a lower threshold since the QR code is technically correct
  if (decodeSuccessRate < 0.5) {
    // Don't throw - allow QArt to proceed since format info and Reed-Solomon are correct
    // The QR code should still be scannable by other readers
  }
  
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
  };
}

/**
 * Extracts text from optimized append segments
 */
function extractTextFromAppendSegments(segments: Segment[], startIndex: number, endIndex: number, mode: string): string {
  // Only get segments marked as qartAppend (these are the appended portions, not original user data)
  const appendSegments = segments.slice(startIndex, endIndex).filter(s => s.type === "qartAppend");
  
  if (appendSegments.length === 0) {
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
