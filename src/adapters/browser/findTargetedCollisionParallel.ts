/**
 * Parallel targeted collision search via the shared worker pool.
 */

import {
  findTargetedCollision,
  serializeRsBlocks,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
  type CharacterChangeSolverOptions,
} from "@/domain/qr/solver";
import type { QRMatrix, QRModule, Segment } from "@/domain/shared/types";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { Input } from "@/state/inputs/types";
import { buildSegmentTypesBySourceId } from "@/domain/qr/corruption";
import { decodeMatrixPayload } from "./validation";
import {
  clampWorkerCount,
  canUseWorkers,
  getWorkerPool,
} from "./workers/pool";
import { serializeMatrixForWorker } from "./workers/serialize";
import { runCollisionShards } from "./findBruteForceCollisionParallel";

export interface ParallelTargetedCollisionOptions {
  matrix: QRMatrix;
  originalPayload: string;
  blocks: QRBlock[];
  segments: Segment[];
  inputs: Input[];
  version: number;
  errorCorrectionLevel: number;
  ecCodewordsPerBlock: number;
  maxFlips?: number;
  maxTrials?: number;
  maxExhaustive?: number;
  seed?: number;
  workerCount?: number;
  signal?: AbortSignal;
  onProgress?: (
    progress: BruteForceCollisionProgress
  ) => void | Promise<void>;
  /** Cap character-change seeds sent to workers. Default 20. */
  charSeedLimit?: number;
}

async function buildCharSeedFlipSets(
  options: ParallelTargetedCollisionOptions
): Promise<string[][]> {
  const limit = options.charSeedLimit ?? 20;
  const payload: { options: CharacterChangeSolverOptions; limit: number } = {
    options: {
      inputs: options.inputs,
      version: options.version,
      errorCorrectionLevel: options.errorCorrectionLevel,
      ecCodewordsPerBlock: options.ecCodewordsPerBlock,
      blocks: options.blocks,
      matrix: options.matrix,
      maxAlternativesPerChar: options.inputs.some((i) => i.mode === "byte")
        ? 60
        : undefined,
    },
    limit,
  };

  try {
    const pool = getWorkerPool();
    return await pool.enqueue<string[][]>({
      type: "charChangeSeeds",
      payload: {
        ...payload,
        options: {
          ...payload.options,
          matrix: serializeMatrixForWorker(options.matrix) as unknown as QRMatrix,
        },
      },
      signal: options.signal,
    });
  } catch {
    return [];
  }
}

export async function findTargetedCollisionParallel(
  options: ParallelTargetedCollisionOptions
): Promise<BruteForceCollisionResult | null> {
  const {
    matrix,
    originalPayload,
    blocks,
    segments,
    ecCodewordsPerBlock,
    maxFlips = 20,
    maxTrials = 3000,
    maxExhaustive = 5000,
    seed = 1,
    signal,
    onProgress,
  } = options;

  const workerCount = clampWorkerCount(options.workerCount);
  if (signal?.aborted) return null;

  const charSeedFlipSets = await buildCharSeedFlipSets(options);
  const serializedBlocks = serializeRsBlocks(blocks);
  const segmentTypesBySourceId = buildSegmentTypesBySourceId(segments);

  if (!canUseWorkers() || workerCount === 1) {
    return findTargetedCollision({
      matrix,
      originalPayload,
      decode: decodeMatrixPayload,
      blocks,
      serializedBlocks,
      segmentTypesBySourceId,
      charSeedFlipSets,
      ecCodewordsPerBlock,
      maxFlips,
      maxTrials,
      maxExhaustive,
      seed,
      workerIndex: 0,
      workerCount: 1,
      signal,
      onProgress,
    });
  }

  return runCollisionShards({
    mode: "targeted",
    matrix,
    originalPayload,
    maxFlips,
    maxTrials,
    maxExhaustive,
    seed,
    workerCount,
    signal,
    onProgress,
    extra: {
      ecCodewordsPerBlock,
      serializedBlocks,
      segmentTypesBySourceId,
      charSeedFlipSets,
    },
  });
}

export type { QRModule };
