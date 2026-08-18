/**
 * In-process job handlers shared by the compute worker and main-thread fallback.
 */

import { runGraph } from "@/domain/pipeline/run";
import { optimizeBlock } from "@/domain/qart/blockOptimizer";
import { ReedSolomonEncoder } from "@/domain/qr/reedsolomon";
import {
  findBruteForceCollision,
  findTargetedCollision,
  enumerateCharacterChangeCandidates,
  findMinimalCharacterChangeFlips,
  type CharacterChangeSolution,
  type BruteForceCollisionResult,
} from "@/domain/qr/solver";
import {
  computeImageQualityMetrics,
  type ImageQualityMetrics,
  type DecodeTrialResult,
} from "@/domain/evaluate";
import { computeImportanceMap, convertTransparencyToWhite } from "@/domain/image";
import jsQR from "jsqr";
import { hydrateContext, hydrateMatrix, asImageData } from "./serialize";
import type {
  JobType,
  RunNodesPayload,
  OptimizeBlockPayload,
  OptimizeBlockResult,
  DecodeImagePayload,
  ScanDecodeResult,
  DecodeMatrixTrialsPayload,
  CollisionShardPayload,
  TransformImagePayload,
  ImageMetricsPayload,
  ImportanceMapPayload,
  CharChangePayload,
} from "./protocol";
import { decodeMatrixPayloadOffscreen } from "../decodeMatrixPayloadOffscreen";
import { decodeMatrixTrialsOnCanvas } from "../decodeTrials";
import { transformDrawableToCanvas } from "../image";
import { createOffscreenEvaluateDecodePort } from "../decodePort";

export interface JobHandleOptions {
  signal?: AbortSignal;
  onProgress?: (progress: unknown) => void;
}

export async function handleJob(
  type: JobType,
  payload: unknown,
  options: JobHandleOptions = {}
): Promise<unknown> {
  switch (type) {
    case "runNodes":
      return handleRunNodes(payload as RunNodesPayload, options);
    case "optimizeBlock":
      return handleOptimizeBlock(payload as OptimizeBlockPayload);
    case "decodeImage":
      return handleDecodeImage(payload as DecodeImagePayload);
    case "decodeMatrixTrials":
      return handleDecodeMatrixTrials(payload as DecodeMatrixTrialsPayload);
    case "collisionShard":
      return handleCollisionShard(payload as CollisionShardPayload, options);
    case "transformImage":
      return handleTransformImage(payload as TransformImagePayload);
    case "imageMetrics":
      return handleImageMetrics(payload as ImageMetricsPayload);
    case "importanceMap":
      return handleImportanceMap(payload as ImportanceMapPayload);
    case "charChangeSeeds":
      return handleCharChangeSeeds(payload as CharChangePayload);
    case "charChangeSolve":
      return handleCharChangeSolve(payload as CharChangePayload);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function handleRunNodes(
  payload: RunNodesPayload,
  options: JobHandleOptions
): Promise<unknown> {
  const ctx = hydrateContext(payload.ctx);
  ctx.signal = options.signal;
  ctx.decodePort = createOffscreenEvaluateDecodePort();
  ctx.deferImageMetrics = payload.deferImageMetrics ?? ctx.deferImageMetrics;
  const result = await runGraph(payload.nodeIds, ctx, {
    params: payload.params,
  });
  const { serializeContext } = await import("./serialize");
  return serializeContext(result);
}

function handleOptimizeBlock(payload: OptimizeBlockPayload): OptimizeBlockResult {
  const encoder = new ReedSolomonEncoder(payload.ecCodewordsPerBlock);
  const editable =
    payload.editableIndices.length > 0
      ? new Set(payload.editableIndices)
      : undefined;
  const stats = optimizeBlock(
    payload.block,
    payload.bitOrder,
    payload.valueGrid,
    payload.dimension,
    payload.ecCodewordsPerBlock,
    editable,
    encoder
  );
  return {
    blockIndex: payload.blockIndex,
    block: payload.block,
    optimized: stats.optimized,
    controlledBits: Array.from(stats.controlledBits.entries()),
  };
}

function handleDecodeImage(payload: DecodeImagePayload): ScanDecodeResult | null {
  try {
    const code = jsQR(payload.data, payload.width, payload.height) as
      | (ReturnType<typeof jsQR> & {
          formatInfo?: ScanDecodeResult["formatInfo"];
        })
      | null;
    if (!code || !code.data) return null;
    return {
      data: code.data,
      version: code.version,
      chunks: code.chunks,
      formatInfo: code.formatInfo,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function handleDecodeMatrixTrials(
  payload: DecodeMatrixTrialsPayload
): Promise<DecodeTrialResult[]> {
  const matrix = hydrateMatrix(payload.matrix);
  if (!matrix) {
    return Array.from({ length: payload.trials }, () => ({
      success: false,
      payload: null,
    }));
  }
  return decodeMatrixTrialsOnCanvas(matrix, payload.trials);
}

async function handleCollisionShard(
  payload: CollisionShardPayload,
  options: JobHandleOptions
): Promise<BruteForceCollisionResult | null> {
  const matrix = hydrateMatrix(payload.matrix);
  if (!matrix) return null;
  const decode = decodeMatrixPayloadOffscreen;
  const onProgress = options.onProgress
    ? (progress: unknown) => options.onProgress?.(progress)
    : undefined;

  if (payload.mode === "targeted") {
    return findTargetedCollision({
      matrix,
      originalPayload: payload.originalPayload,
      decode,
      serializedBlocks: payload.serializedBlocks,
      segmentTypesBySourceId: payload.segmentTypesBySourceId,
      charSeedFlipSets: payload.charSeedFlipSets ?? [],
      ecCodewordsPerBlock: payload.ecCodewordsPerBlock ?? 0,
      maxFlips: payload.maxFlips,
      maxTrials: payload.maxTrials,
      maxExhaustive: payload.maxExhaustive,
      seed: payload.seed,
      workerIndex: payload.workerIndex,
      workerCount: payload.workerCount,
      signal: options.signal,
      onProgress,
    });
  }

  return findBruteForceCollision({
    matrix,
    originalPayload: payload.originalPayload,
    decode,
    maxFlips: payload.maxFlips,
    maxTrials: payload.maxTrials,
    maxExhaustive: payload.maxExhaustive,
    seed: payload.seed,
    workerIndex: payload.workerIndex,
    workerCount: payload.workerCount,
    signal: options.signal,
    onProgress,
  });
}

async function handleTransformImage(
  payload: TransformImagePayload
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const source =
    payload.bitmap ??
    (payload.imageData ? asImageData(payload.imageData) : null);
  if (!source) {
    throw new Error("transformImage job missing image");
  }
  const transformed = await transformDrawableToCanvas(
    source,
    payload.canvasSize,
    payload.scale,
    payload.offsetX,
    payload.offsetY
  );
  const opaque = convertTransparencyToWhite(transformed);
  return { data: opaque.data, width: opaque.width, height: opaque.height };
}

function handleImageMetrics(payload: ImageMetricsPayload): ImageQualityMetrics {
  return computeImageQualityMetrics(
    asImageData(payload.reference),
    asImageData(payload.rendered)
  );
}

function handleImportanceMap(payload: ImportanceMapPayload): Float32Array {
  return computeImportanceMap(
    asImageData(payload.image),
    payload.size,
    payload.alpha
  );
}

function handleCharChangeSeeds(payload: CharChangePayload): string[][] {
  const options = {
    ...payload.options,
    matrix: hydrateMatrix(payload.options.matrix as never) ?? payload.options.matrix,
  };
  try {
    const candidates = enumerateCharacterChangeCandidates(
      options,
      payload.limit ?? 20
    );
    return candidates
      .map((c) => c.flipModuleIds)
      .filter((ids) => ids?.length > 0);
  } catch {
    return [];
  }
}

function handleCharChangeSolve(
  payload: CharChangePayload
): CharacterChangeSolution | null {
  const options = {
    ...payload.options,
    matrix: hydrateMatrix(payload.options.matrix as never) ?? payload.options.matrix,
  };
  return findMinimalCharacterChangeFlips(options);
}
