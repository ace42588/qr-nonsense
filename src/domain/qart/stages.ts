/**
 * QArt generation stages — extracted from the former monolithic generateQArt.
 */

import { Segment, QRMatrix, Codeword, VersionInfo, Bit } from "../shared/types";
import { getCodewords } from "../qr";
import { getMatrix } from "../qr/matrix";
import { interleave } from "../qr/codewords/utils";
import {
  rasterizeImageToQRGrid,
  computeContrastGrid,
  type ImageData,
} from "../image";
import { computeVisualError } from "../evaluate/visual";
import { QRBlock } from "../qr/codewords/blocks";
import {
  buildBitOrderFromWeights,
  PriorityFunctionType,
  type BitPosition,
} from "./bitPriority";
import { optimizeBlock } from "./blockOptimizer";
import {
  constraintsFromImageGrids,
  type ConstraintSet,
} from "../constraints";
import { createControlMatrix } from "./controlMatrix";
import { ReedSolomonEncoder } from "../qr/reedsolomon";
import { codewordsToBytes } from "./codewordConversion";
import { appendDataToSegments } from "./appendData";
import { addFill, addPadding, addTerminator, getNumBits } from "../qr/encoders/utils";
import { updateCharCountIndicatorLengths } from "../qr/charCount";
import { updateSegmentTextFromCodewords, decodeSegmentValue } from "./decodeSegments";
import type { QArtAppendData, QArtOptimizedAppendData } from "./types";
import { logger as log } from "@/adapters/logger";

export function deepCopyBlock(block: QRBlock): QRBlock {
  const copyCodeword = (codeword: Codeword): Codeword => {
    const copiedBits: Bit[] = codeword.bits.map((bit) => ({
      ...bit,
      value: bit.value,
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

export interface AppendQArtDataResult {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  matrix: QRMatrix;
}

/**
 * Strip terminator/fill/padding, append QArt data, re-finalize, rebuild blocks/matrix.
 * When append is disabled, deep-copies blocks and returns the initial matrix.
 */
export function appendQArtData(options: {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  initialMatrix: QRMatrix;
  versionInfo: VersionInfo;
  errorCorrectionLevel: number;
  appendData?: QArtAppendData;
  maskIndex?: number;
}): AppendQArtDataResult {
  const {
    segments: originalSegments,
    codewords: originalCodewords,
    blocks: qrBlocks,
    initialMatrix,
    versionInfo,
    errorCorrectionLevel,
    appendData,
    maskIndex = 0,
  } = options;

  if (!appendData?.enabled) {
    return {
      segments: originalSegments,
      codewords: originalCodewords,
      blocks: qrBlocks.map(deepCopyBlock),
      matrix: initialMatrix,
    };
  }

  try {
    const dataSegmentsOnly = originalSegments.filter(
      (s) =>
        s.type !== "padding" && s.type !== "terminator" && s.type !== "fill"
    );

    if (dataSegmentsOnly.length === 0) {
      throw new Error("No data segments found. Cannot append data.");
    }

    const segmentsWithAppended = updateCharCountIndicatorLengths(
      appendDataToSegments(dataSegmentsOnly, appendData, versionInfo),
      versionInfo.version
    );

    const { requiredDataCodewords } = versionInfo;
    const capacityBits = requiredDataCodewords * 8;
    const appendedBits = getNumBits(segmentsWithAppended);

    if (appendedBits > capacityBits) {
      throw new Error(
        `Appended data length exceeds QR code capacity. Current: ${appendedBits} bits, Capacity: ${capacityBits} bits. Try using a larger QR version or reducing the append length.`
      );
    }

    const finalizedSegments = addPadding(
      addFill(
        addTerminator(segmentsWithAppended, requiredDataCodewords),
        requiredDataCodewords
      ),
      requiredDataCodewords
    );

    const codewordsResult = getCodewords(
      finalizedSegments,
      versionInfo.version,
      errorCorrectionLevel
    );
    const { matrix: newInitialMatrix } = getMatrix(
      [...codewordsResult.codewords],
      maskIndex,
      versionInfo.version,
      errorCorrectionLevel
    );

    return {
      segments: finalizedSegments,
      codewords: codewordsResult.codewords,
      blocks: codewordsResult.blocks,
      matrix: newInitialMatrix,
    };
  } catch (err) {
    throw new Error(
      `Failed to append data: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export interface PrepareImageGridsResult {
  normalizedTargetImage: ImageData;
  targetGrid: Float32Array;
  contrastGrid: Float32Array;
  dimension: number;
}

/**
 * Build offscreen target image and module brightness / contrast grids.
 */
export async function prepareImageGrids(options: {
  version: number;
  targetImage: ImageData;
  sourceImage?: HTMLImageElement | ImageBitmap | ImageData;
  transformParams?: { scale: number; offsetX: number; offsetY: number };
  targetGridOverride?: Float32Array;
}): Promise<PrepareImageGridsResult> {
  const {
    version,
    targetImage,
    sourceImage,
    transformParams,
    targetGridOverride,
  } = options;
  const dimension = version * 4 + 17;
  const SCALE_FACTOR = 27;
  const offscreenCanvasSize = dimension * SCALE_FACTOR;

  let normalizedTargetImage: ImageData;

  if (sourceImage && transformParams) {
    const { transformImageToCanvas } = await import("@/adapters/browser/image");
    const { convertTransparencyToWhite } = await import("@/domain/image");

    const REFERENCE_CANVAS_SIZE = 480;
    const scaleRatio = offscreenCanvasSize / REFERENCE_CANVAS_SIZE;
    const adjustedScale = transformParams.scale * scaleRatio;
    const adjustedOffsetX = transformParams.offsetX * scaleRatio;
    const adjustedOffsetY = transformParams.offsetY * scaleRatio;

    const transformed = await transformImageToCanvas(
      sourceImage,
      offscreenCanvasSize,
      adjustedScale,
      adjustedOffsetX,
      adjustedOffsetY
    );
    normalizedTargetImage = convertTransparencyToWhite(transformed);
  } else {
    normalizedTargetImage = targetImage;

    if (
      targetImage.width !== offscreenCanvasSize ||
      targetImage.height !== offscreenCanvasSize
    ) {
      try {
        const { create2dCanvas } = await import("@/adapters/browser/canvasPort");
        const dest = create2dCanvas(offscreenCanvasSize, offscreenCanvasSize);
        dest.ctx.imageSmoothingEnabled = false;
        dest.ctx.fillStyle = "white";
        dest.ctx.fillRect(0, 0, offscreenCanvasSize, offscreenCanvasSize);

        const temp = create2dCanvas(targetImage.width, targetImage.height);
        temp.ctx.putImageData(targetImage, 0, 0);

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

        dest.ctx.drawImage(
          temp.canvas as CanvasImageSource,
          0,
          0,
          targetImage.width,
          targetImage.height,
          drawX,
          drawY,
          drawWidth,
          drawHeight
        );
        normalizedTargetImage = dest.ctx.getImageData(
          0,
          0,
          offscreenCanvasSize,
          offscreenCanvasSize
        );
      } catch {
        normalizedTargetImage = targetImage;
      }
    }
  }

  const targetGrid =
    targetGridOverride &&
    targetGridOverride.length === dimension * dimension
      ? targetGridOverride
      : rasterizeImageToQRGrid(normalizedTargetImage, dimension);

  const contrastGrid = computeContrastGrid(targetGrid, dimension, 5);

  return {
    normalizedTargetImage,
    targetGrid,
    contrastGrid,
    dimension,
  };
}

export interface OptimizeQArtBlocksResult {
  workingBlocks: QRBlock[];
  controlledBits: Map<string, boolean>;
  totalBitsOptimized: number;
}

/**
 * Editable-selection context slice produced by qartSelectEditable and
 * consumed by qartBitPriority / qartSolve.
 */
export interface QArtEditableSelection {
  /** Segment ids whose bits may be rewritten (padding + qartAppend). */
  editableSegmentIds: Set<string>;
  /** Subset of editableSegmentIds coming from qartAppend segments. */
  appendSegmentIds: Set<string>;
  /**
   * Per-block sets of data-codeword indices whose bits are ALL owned by
   * editable segments (parallel to the blocks array). Used by setBlockBit
   * safety checks.
   */
  editableCodewordIndices: Set<number>[];
  /**
   * Bit ids excluded from control to prevent invalid segment values.
   * Reserved hook — currently always empty, preserved from the pre-split
   * implementation.
   */
  excludeLastSegmentBits: Set<string>;
}

/**
 * Discover which segments/codewords QArt may rewrite: padding and
 * qartAppend segments, plus the per-block editable codeword index sets.
 * Throws when nothing is editable or when the matrix cannot resolve bits.
 */
export function qartSelectEditable(options: {
  segments: Segment[];
  workingBlocks: QRBlock[];
  matrixForBitLookup: QRMatrix;
}): QArtEditableSelection {
  const { segments, workingBlocks, matrixForBitLookup } = options;

  const paddingSegments = segments.filter((s) => s.type === "padding");
  const appendSegments = segments.filter((s) => s.type === "qartAppend");
  const editableSegmentIds = new Set([
    ...paddingSegments.map((s) => s.id),
    ...appendSegments.map((s) => s.id),
  ]);
  const appendSegmentIds = new Set(appendSegments.map((s) => s.id));

  if (editableSegmentIds.size === 0) {
    throw new Error(
      "No editable segments found. QArt requires padding segments or appended data to optimize. Try adding more data, using a larger QR version, or enabling append data."
    );
  }

  if (!matrixForBitLookup.getModuleByBitId) {
    throw new Error(
      "Initial matrix does not have getModuleByBitId method. This is required for QArt optimization."
    );
  }

  const editableCodewordIndices = workingBlocks.map((block) => {
    const indices = new Set<number>();
    for (let cwIdx = 0; cwIdx < block.data.length; cwIdx++) {
      const codeword = block.data[cwIdx];
      if (
        codeword?.bits &&
        codeword.bits.every(
          (bit) => bit?.sourceId && editableSegmentIds.has(bit.sourceId)
        )
      ) {
        indices.add(cwIdx);
      }
    }
    return indices;
  });

  return {
    editableSegmentIds,
    appendSegmentIds,
    editableCodewordIndices,
    excludeLastSegmentBits: new Set<string>(),
  };
}

/**
 * Build the per-block priority-ordered bit lists. Priority weights come
 * from ConstraintSet.weightGrid (which already encodes contrast × (1 − roi),
 * so the legacy "contrast"/"roi" priority functions are both a weight
 * lookup); "random" stays a parameter and draws uniform random priorities.
 *
 * Bit ordering is a pure function of block structure (bit ids/sources),
 * not bit values, so it can run for all blocks before any block is solved.
 */
export function qartBitPriority(options: {
  workingBlocks: QRBlock[];
  matrixForBitLookup: QRMatrix;
  constraints: ConstraintSet;
  selection: QArtEditableSelection;
  priorityFunction?: PriorityFunctionType;
  signal?: AbortSignal;
}): BitPosition[][] {
  const {
    workingBlocks,
    matrixForBitLookup,
    constraints,
    selection,
    priorityFunction = "contrast",
    signal,
  } = options;

  const weights =
    priorityFunction === "random"
      ? ("random" as const)
      : constraints.weightGrid;

  const bitOrders: BitPosition[][] = [];
  for (const block of workingBlocks) {
    if (signal?.aborted) {
      throw new Error("QArt generation was cancelled");
    }
    bitOrders.push(
      buildBitOrderFromWeights(
        block,
        matrixForBitLookup,
        constraints.dimension,
        selection.editableSegmentIds,
        weights,
        selection.excludeLastSegmentBits,
        selection.appendSegmentIds
      )
    );
  }
  return bitOrders;
}

/**
 * Solve every block: initBlockBasis + setBlockBit loop + applyBlockBasis
 * (via optimizeBlock), then a final Reed-Solomon verification pass.
 *
 * Desired bits come from ConstraintSet.valueGrid (targetGrid semantics:
 * value < 0.5 means "want a dark module"). optimizeBlock converts desired
 * darkness into raw bit values ASSUMING MASK 0 ((x + y) % 2 === 0); QArt
 * pins maskIndex 0 end-to-end (finalizeQArtMatrix throws if getMatrix
 * settles on a different mask), so the assumption holds.
 *
 * A single ReedSolomonEncoder is cached across blocks (solve + verify),
 * matching the pre-split implementation.
 */
export function qartSolve(options: {
  workingBlocks: QRBlock[];
  bitOrders: BitPosition[][];
  constraints: ConstraintSet;
  selection: QArtEditableSelection;
  ecCodewordsPerBlock: number;
  signal?: AbortSignal;
}): OptimizeQArtBlocksResult {
  const {
    workingBlocks,
    bitOrders,
    constraints,
    selection,
    ecCodewordsPerBlock,
    signal,
  } = options;

  const cachedEncoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const controlledBits = new Map<string, boolean>();
  let totalBitsOptimized = 0;

  for (let blockNum = 0; blockNum < workingBlocks.length; blockNum++) {
    if (signal?.aborted) {
      throw new Error("QArt generation was cancelled");
    }

    const block = workingBlocks[blockNum];
    const bitOrder = bitOrders[blockNum] ?? [];

    if (bitOrder.length === 0) {
      continue;
    }

    const stats = optimizeBlock(
      block,
      bitOrder,
      constraints.valueGrid,
      constraints.dimension,
      ecCodewordsPerBlock,
      selection.editableCodewordIndices[blockNum],
      cachedEncoder
    );

    totalBitsOptimized += stats.optimized;
    for (const [bitId, wasControlled] of stats.controlledBits) {
      controlledBits.set(bitId, wasControlled);
    }
  }

  if (totalBitsOptimized === 0) {
    throw new Error(
      "QArt optimization completed but no bits were modified. This may indicate insufficient padding capacity or a bug in the optimization algorithm."
    );
  }

  verifyOptimizedBlocks(workingBlocks, ecCodewordsPerBlock, cachedEncoder);

  return { workingBlocks, controlledBits, totalBitsOptimized };
}

/**
 * Verify Reed-Solomon EC bytes after QArt block optimization.
 */
export function verifyOptimizedBlocks(
  workingBlocks: QRBlock[],
  ecCodewordsPerBlock: number,
  encoder?: ReedSolomonEncoder
): void {
  const cachedEncoder = encoder ?? new ReedSolomonEncoder(ecCodewordsPerBlock);
  for (let i = 0; i < workingBlocks.length; i++) {
    const block = workingBlocks[i];
    const { dataBytes, ecBytes: actualEC } = codewordsToBytes(block);
    const expectedEC = cachedEncoder.encode(dataBytes);
    for (let j = 0; j < expectedEC.length; j++) {
      if (expectedEC[j] !== actualEC[j]) {
        throw new Error(
          "Reed-Solomon encoding verification failed. QArt optimization may have corrupted the QR code."
        );
      }
    }
  }
}

/**
 * Thin compatibility wrapper over the qartSelectEditable → qartBitPriority
 * → qartSolve split. Builds a ConstraintSet from the legacy grid arguments
 * and runs the three stages; the exported signature is unchanged.
 */
export function optimizeQArtBlocks(options: {
  segments: Segment[];
  workingBlocks: QRBlock[];
  matrixForBitLookup: QRMatrix;
  targetGrid: Float32Array;
  contrastGrid: Float32Array;
  dimension: number;
  ecCodewordsPerBlock: number;
  priorityFunction?: PriorityFunctionType;
  roiGrid?: Float32Array;
  signal?: AbortSignal;
}): OptimizeQArtBlocksResult {
  const {
    segments,
    workingBlocks,
    matrixForBitLookup,
    targetGrid,
    contrastGrid,
    dimension,
    ecCodewordsPerBlock,
    priorityFunction = "contrast",
    roiGrid,
    signal,
  } = options;

  const selection = qartSelectEditable({
    segments,
    workingBlocks,
    matrixForBitLookup,
  });

  // Fold roiGrid into the weights only for the "roi" priority function —
  // the legacy "contrast" branch ignored roiGrid, and that behavior is
  // preserved exactly.
  const constraints = constraintsFromImageGrids(
    targetGrid,
    contrastGrid,
    priorityFunction === "roi" ? roiGrid : undefined,
    dimension
  );

  const bitOrders = qartBitPriority({
    workingBlocks,
    matrixForBitLookup,
    constraints,
    selection,
    priorityFunction,
    signal,
  });

  return qartSolve({
    workingBlocks,
    bitOrders,
    constraints,
    selection,
    ecCodewordsPerBlock,
    signal,
  });
}

export interface RebuildFromBlocksResult {
  finalCodewords: Codeword[];
  updatedSegments: Segment[];
  workingBlocks: QRBlock[];
}

/**
 * Interleave optimized blocks, update segment text, optionally fix CCI/EC for append.
 */
export function rebuildFromBlocks(options: {
  segments: Segment[];
  workingBlocks: QRBlock[];
  appendData?: QArtAppendData;
  ecCodewordsPerBlock: number;
}): RebuildFromBlocksResult {
  const { segments, workingBlocks, appendData, ecCodewordsPerBlock } = options;
  const cachedEncoder = new ReedSolomonEncoder(ecCodewordsPerBlock);

  const modifiedDataCodewords = interleave(workingBlocks.map((b) => b.data));
  const modifiedECCodewords = interleave(
    workingBlocks.map((b) => b.errorCorrection)
  );
  const finalCodewords = [...modifiedDataCodewords, ...modifiedECCodewords];

  let updatedSegments = segments;
  const paddingUpdate = updateSegmentTextFromCodewords(
    updatedSegments,
    finalCodewords,
    "byte"
  );
  updatedSegments = paddingUpdate.segments;

  if (appendData?.enabled) {
    const appendSegs = segments.filter((s) => s.type === "qartAppend");
    if (appendSegs.length > 0) {
      let appendMode: string | null = null;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === "modeIndicator") {
          let foundAppend = false;
          let j = i + 1;
          while (
            j < segments.length &&
            segments[j].type !== "modeIndicator" &&
            segments[j].type !== "terminator" &&
            segments[j].type !== "fill" &&
            segments[j].type !== "padding"
          ) {
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
        const appendUpdate = updateSegmentTextFromCodewords(
          updatedSegments,
          finalCodewords,
          appendMode
        );
        updatedSegments = appendUpdate.segments;

        if (appendMode === "numeric" || appendMode === "alphanumeric") {
          let charCountIndicator: Segment | null = null;
          let charCountIndicatorIndex = -1;
          for (let i = 0; i < updatedSegments.length; i++) {
            if (
              updatedSegments[i].type === "modeIndicator" &&
              ((appendMode === "numeric" && updatedSegments[i].value === 0x1) ||
                (appendMode === "alphanumeric" &&
                  updatedSegments[i].value === 0x2))
            ) {
              if (
                i + 1 < updatedSegments.length &&
                updatedSegments[i + 1].type === "characterCountIndicator"
              ) {
                charCountIndicator = updatedSegments[i + 1];
                charCountIndicatorIndex = i + 1;
                break;
              }
            }
          }
          if (
            charCountIndicator &&
            charCountIndicator.bitIds &&
            charCountIndicator.bitIds.length > 0
          ) {
            let appendGroupStart = -1;
            let appendGroupEnd = -1;
            for (let i = 0; i < updatedSegments.length; i++) {
              if (
                updatedSegments[i].type === "modeIndicator" &&
                ((appendMode === "numeric" &&
                  updatedSegments[i].value === 0x1) ||
                  (appendMode === "alphanumeric" &&
                    updatedSegments[i].value === 0x2))
              ) {
                appendGroupStart = i;
                for (let j = i + 2; j < updatedSegments.length; j++) {
                  if (
                    updatedSegments[j].type === "modeIndicator" ||
                    updatedSegments[j].type === "terminator" ||
                    updatedSegments[j].type === "fill" ||
                    updatedSegments[j].type === "padding"
                  ) {
                    appendGroupEnd = j;
                    break;
                  }
                }
                if (appendGroupEnd === -1) appendGroupEnd = updatedSegments.length;
                break;
              }
            }
            const appendGroupDataSegments = updatedSegments
              .slice(appendGroupStart + 2, appendGroupEnd)
              .filter((s) => s.type === "data" || s.type === "qartAppend");
            const totalDecodedChars = appendGroupDataSegments.reduce(
              (sum, s) => {
                const text = (s as Segment & { text?: string }).text;
                if (text) return sum + text.length;
                if (s.type === "data") {
                  const decoded = decodeSegmentValue(s, appendMode);
                  return sum + decoded.length;
                }
                return sum;
              },
              0
            );
            const bitToCodewordMap = new Map<
              string,
              { codewordIndex: number; bitIndex: number }
            >();
            finalCodewords.forEach((codeword, cwIdx) => {
              if (codeword.bits) {
                codeword.bits.forEach((bit, bitIdx) => {
                  if (bit && bit.id) {
                    bitToCodewordMap.set(bit.id, {
                      codewordIndex: cwIdx,
                      bitIndex: bitIdx,
                    });
                  }
                });
              }
            });
            let actualCharCountFromBits = 0;
            if (
              charCountIndicator.bitIds &&
              charCountIndicator.bitIds.length > 0
            ) {
              const bitValues: number[] = [];
              for (const bitId of charCountIndicator.bitIds) {
                const mapping = bitToCodewordMap.get(bitId);
                if (mapping) {
                  const codeword = finalCodewords[mapping.codewordIndex];
                  if (
                    codeword &&
                    codeword.bits &&
                    codeword.bits[mapping.bitIndex]
                  ) {
                    bitValues.push(codeword.bits[mapping.bitIndex].value);
                  }
                }
              }
              if (bitValues.length === charCountIndicator.length) {
                for (let i = 0; i < bitValues.length; i++) {
                  actualCharCountFromBits =
                    (actualCharCountFromBits << 1) | bitValues[i];
                }
              }
            }
            if (
              charCountIndicator.value !== totalDecodedChars ||
              actualCharCountFromBits !== totalDecodedChars
            ) {
              updatedSegments[charCountIndicatorIndex] = {
                ...charCountIndicator,
                value: totalDecodedChars,
              };
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
                  if (
                    codeword &&
                    codeword.bits &&
                    codeword.bits[mapping.bitIndex]
                  ) {
                    codeword.bits[mapping.bitIndex].value = newCharCountBits[i];
                  }
                }
              }
              appendUpdate.bitsWereClamped = true;
            }
          }
        }

        if (appendUpdate.bitsWereClamped) {
          for (let blockIdx = 0; blockIdx < workingBlocks.length; blockIdx++) {
            const block = workingBlocks[blockIdx];
            const { dataBytes } = codewordsToBytes(block);
            const newECBytes = cachedEncoder.encode(dataBytes);
            const { ecBytes: existingECBytes } = codewordsToBytes(block);
            let ecBytesMatch = true;
            for (let i = 0; i < newECBytes.length; i++) {
              if (newECBytes[i] !== existingECBytes[i]) {
                ecBytesMatch = false;
                break;
              }
            }
            if (!ecBytesMatch) {
              for (let i = 0; i < newECBytes.length; i++) {
                const byte = newECBytes[i];
                for (let bit = 0; bit < 8; bit++) {
                  block.errorCorrection[i].bits[bit].value =
                    (byte >> (7 - bit)) & 1;
                }
              }
            }
          }

          const updatedDataCodewords = interleave(
            workingBlocks.map((b) => b.data)
          );
          const updatedECCodewords = interleave(
            workingBlocks.map((b) => b.errorCorrection)
          );
          finalCodewords.length = 0;
          finalCodewords.push(...updatedDataCodewords, ...updatedECCodewords);
        }
      }
    }
  }

  return { finalCodewords, updatedSegments, workingBlocks };
}

export interface FinalizeQArtMatrixResult {
  matrix: QRMatrix;
  dataMask: number;
  controlMatrix: QRMatrix;
  error: number;
}

export function finalizeQArtMatrix(options: {
  finalCodewords: Codeword[];
  version: number;
  errorCorrectionLevel: number;
  maskIndex?: number;
  targetGrid: Float32Array;
  dimension: number;
  controlledBits: Map<string, boolean>;
}): FinalizeQArtMatrixResult {
  const {
    finalCodewords,
    version,
    errorCorrectionLevel,
    maskIndex = 0,
    targetGrid,
    dimension,
    controlledBits,
  } = options;

  const { matrix, dataMask: usedMask } = getMatrix(
    finalCodewords,
    maskIndex,
    version,
    errorCorrectionLevel
  );

  if (usedMask !== maskIndex) {
    throw new Error(
      `QArt requested mask ${maskIndex} but got mask ${usedMask} from getMatrix`
    );
  }

  const error = computeVisualError(matrix, targetGrid, dimension);
  const controlMatrix = createControlMatrix(matrix, controlledBits);

  return { matrix, dataMask: usedMask, controlMatrix, error };
}

export function extractTextFromAppendSegments(
  segments: Segment[],
  _startIndex: number,
  _endIndex: number,
  mode: string
): string {
  log.debug("extractTextFromAppendSegments", segments, _startIndex, _endIndex, mode);
  const appendSegments = segments.filter((s) => s.type === "qartAppend");

  if (appendSegments.length === 0) {
    log.debug("extractTextFromAppendSegments", "No append segments found");
    return "";
  }

  type SegmentWithText = Segment & { text?: string };

  const getSegmentText = (s: Segment): string => {
    const segWithText = s as SegmentWithText;
    if (!segWithText.text || segWithText.text.trim() === "") {
      return decodeSegmentValue(s, mode);
    }
    return segWithText.text || "";
  };

  return appendSegments.map(getSegmentText).join("");
}

export function extractOptimizedAppendData(
  segments: Segment[],
  updatedSegments: Segment[],
  appendData?: QArtAppendData
): QArtOptimizedAppendData | undefined {
  if (!appendData?.enabled) return undefined;

  const appendSegments = segments.filter((s) => s.type === "qartAppend");
  if (appendSegments.length === 0) return undefined;

  const appendSegmentIds = new Set(appendSegments.map((s) => s.id));
  let appendGroupStart = -1;
  let appendGroupEnd = -1;
  let appendMode: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === "modeIndicator") {
      let j = i + 1;
      while (
        j < segments.length &&
        segments[j].type !== "modeIndicator" &&
        segments[j].type !== "terminator" &&
        segments[j].type !== "fill" &&
        segments[j].type !== "padding"
      ) {
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
        appendGroupEnd = j;
        break;
      }
    }
  }

  if (appendGroupStart === -1 || !appendMode) return undefined;

  const appendTextSegments = updatedSegments.filter(
    (s) => s.type === "qartAppend"
  );
  const appendText = extractTextFromAppendSegments(
    updatedSegments,
    appendGroupStart,
    appendGroupEnd,
    appendMode
  );

  return {
    segments: appendTextSegments,
    originalText: appendText,
    encodingMode: appendMode,
  };
}
