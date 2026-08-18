/**
 * Parallel brute-force collision search via the shared worker pool.
 * First shard to find a collision aborts the rest (pool is kept).
 */

import {
  findBruteForceCollision,
  type BruteForceCollisionOptions,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
} from "@/domain/qr/solver";
import type { QRMatrix } from "@/domain/shared/types";
import { decodeMatrixPayload } from "./validation";
import {
  getWorkerPool,
  clampWorkerCount,
  canUseWorkers,
  JobCancelledError,
} from "./workers/pool";
import { serializeMatrixForWorker } from "./workers/serialize";
import type { CollisionShardPayload } from "./workers/protocol";

export { clampWorkerCount, serializeMatrixForWorker };

export interface ParallelCollisionOptions {
  matrix: QRMatrix;
  originalPayload: string;
  maxFlips?: number;
  maxTrials?: number;
  maxExhaustive?: number;
  seed?: number;
  /** Requested worker count; clamped to 1..16. Default: hardwareConcurrency || 4. */
  workerCount?: number;
  signal?: AbortSignal;
  onProgress?: (
    progress: BruteForceCollisionProgress
  ) => void | Promise<void>;
}

export async function findBruteForceCollisionParallel(
  options: ParallelCollisionOptions
): Promise<BruteForceCollisionResult | null> {
  const {
    matrix,
    originalPayload,
    maxFlips = 20,
    maxTrials = 3000,
    maxExhaustive = 5000,
    seed = 1,
    signal,
    onProgress,
  } = options;

  const workerCount = clampWorkerCount(options.workerCount);
  if (signal?.aborted) return null;

  if (!canUseWorkers() || workerCount === 1) {
    return findBruteForceCollision({
      matrix,
      originalPayload,
      decode: decodeMatrixPayload,
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
    mode: "uniform",
    matrix,
    originalPayload,
    maxFlips,
    maxTrials,
    maxExhaustive,
    seed,
    workerCount,
    signal,
    onProgress,
  });
}

export async function runCollisionShards(args: {
  mode: "uniform" | "targeted";
  matrix: QRMatrix;
  originalPayload: string;
  maxFlips: number;
  maxTrials: number;
  maxExhaustive: number;
  seed: number;
  workerCount: number;
  signal?: AbortSignal;
  onProgress?: (
    progress: BruteForceCollisionProgress
  ) => void | Promise<void>;
  extra?: Partial<CollisionShardPayload>;
}): Promise<BruteForceCollisionResult | null> {
  const pool = getWorkerPool();
  const serialized = serializeMatrixForWorker(args.matrix);
  const trialsByWorker = new Array<number>(args.workerCount).fill(0);
  let latestMeta: Pick<
    BruteForceCollisionProgress,
    "k" | "maxFlips" | "mode" | "eligibleCount" | "phase"
  > = {
    k: 1,
    maxFlips: args.maxFlips,
    mode: "exhaustive",
    eligibleCount: 0,
  };

  const controllers = Array.from(
    { length: args.workerCount },
    () => new AbortController()
  );

  const onParentAbort = () => {
    for (const c of controllers) c.abort();
  };
  if (args.signal) {
    if (args.signal.aborted) return null;
    args.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const report = async () => {
    const trialsUsed = trialsByWorker.reduce((a, b) => a + b, 0);
    await args.onProgress?.({
      trialsUsed,
      maxTrials: args.maxTrials,
      k: latestMeta.k,
      maxFlips: latestMeta.maxFlips,
      mode: latestMeta.mode,
      eligibleCount: latestMeta.eligibleCount,
      phase: latestMeta.phase,
      workerCount: args.workerCount,
    });
  };

  try {
    const jobs = controllers.map((controller, i) => {
      const payload: CollisionShardPayload = {
        mode: args.mode,
        matrix: serialized,
        originalPayload: args.originalPayload,
        maxFlips: args.maxFlips,
        maxTrials: args.maxTrials,
        maxExhaustive: args.maxExhaustive,
        seed: args.seed,
        workerIndex: i,
        workerCount: args.workerCount,
        ...args.extra,
      };
      return pool
        .enqueue<BruteForceCollisionResult | null>({
          type: "collisionShard",
          payload,
          signal: controller.signal,
          onProgress: (progress) => {
            const p = progress as BruteForceCollisionProgress;
            if (typeof p.workerIndex === "number") {
              trialsByWorker[p.workerIndex] = p.trialsUsed;
            }
            latestMeta = {
              k: p.k,
              maxFlips: p.maxFlips,
              mode: p.mode,
              eligibleCount: p.eligibleCount,
              phase: p.phase,
            };
            void report();
          },
        })
        .then((result) => {
          if (result) {
            trialsByWorker[i] = result.trialsUsed;
            for (let j = 0; j < controllers.length; j++) {
              if (j !== i) controllers[j].abort();
            }
            return {
              ...result,
              trialsUsed: trialsByWorker.reduce((a, b) => a + b, 0),
            };
          }
          return null;
        })
        .catch((err) => {
          if (err instanceof JobCancelledError) return null;
          throw err;
        });
    });

    const results = await Promise.all(jobs);
    return results.find((r) => r != null) ?? null;
  } finally {
    args.signal?.removeEventListener("abort", onParentAbort);
  }
}

export type { BruteForceCollisionOptions };
