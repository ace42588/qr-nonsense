/**
 * Parallel brute-force collision search via Web Workers.
 * First worker to find a collision terminates the rest.
 */

import {
  findBruteForceCollision,
  type BruteForceCollisionOptions,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
} from "@/domain/qr/solver";
import type { QRMatrix, QRModule } from "@/domain/shared/types";
import { decodeMatrixPayload } from "./validation";
import type {
  CollisionWorkerInMessage,
  CollisionWorkerOutMessage,
} from "./collision.worker";

const MAX_WORKERS = 16;

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

function defaultWorkerCount(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4;
}

export function clampWorkerCount(requested?: number): number {
  const n =
    requested == null || !Number.isFinite(requested)
      ? defaultWorkerCount()
      : Math.floor(requested);
  return Math.min(MAX_WORKERS, Math.max(1, n));
}

/** Plain-clone matrix rows for structured clone (drop getModuleByBitId). */
export function serializeMatrixForWorker(matrix: QRMatrix): QRModule[][] {
  return matrix.map((row) =>
    row.map((m) => {
      if (!m) return m;
      return {
        id: m.id,
        bitId: m.bitId,
        bit: {
          id: m.bit?.id,
          value: m.bit?.value ?? 0,
          sourceId: m.bit?.sourceId,
          type: m.bit?.type,
        },
        x: m.x,
        y: m.y,
        isDark: m.isDark,
        isMasked: m.isMasked,
        type: m.type,
        nonData: m.nonData,
        source: m.source ? { ...m.source } : undefined,
      } as QRModule;
    })
  );
}

function canUseWorkers(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof URL !== "undefined"
  );
}

/**
 * Run collision search across workers. First hit wins and stops peers.
 * Falls back to main-thread search when workers/OffscreenCanvas unavailable.
 */
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

  const serialized = serializeMatrixForWorker(matrix);
  const workers: Worker[] = [];
  const trialsByWorker = new Array<number>(workerCount).fill(0);
  let latestMeta: Pick<
    BruteForceCollisionProgress,
    "k" | "maxFlips" | "mode" | "eligibleCount"
  > = {
    k: 1,
    maxFlips,
    mode: "exhaustive",
    eligibleCount: 0,
  };

  let settled = false;
  let foundResult: BruteForceCollisionResult | null = null;
  let rejectError: Error | null = null;
  let doneCount = 0;

  const terminateAll = () => {
    for (const w of workers) {
      try {
        w.terminate();
      } catch {
        /* ignore */
      }
    }
    workers.length = 0;
  };

  const reportAggregate = async () => {
    const trialsUsed = trialsByWorker.reduce((a, b) => a + b, 0);
    await onProgress?.({
      trialsUsed,
      maxTrials,
      k: latestMeta.k,
      maxFlips: latestMeta.maxFlips,
      mode: latestMeta.mode,
      eligibleCount: latestMeta.eligibleCount,
      workerCount,
    });
  };

  return new Promise<BruteForceCollisionResult | null>((resolve, reject) => {
    const finish = (result: BruteForceCollisionResult | null) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      terminateAll();
      resolve(result);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      terminateAll();
      reject(err);
    };

    const onAbort = () => {
      finish(null);
    };

    if (signal) {
      if (signal.aborted) {
        finish(null);
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    for (let i = 0; i < workerCount; i++) {
      let worker: Worker;
      try {
        worker = new Worker(
          new URL("./collision.worker.ts", import.meta.url),
          { type: "module" }
        );
      } catch {
        terminateAll();
        // Fallback if worker construction fails
        findBruteForceCollision({
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
        })
          .then(finish)
          .catch(fail);
        return;
      }

      workers.push(worker);

      worker.onmessage = (event: MessageEvent<CollisionWorkerOutMessage>) => {
        if (settled) return;
        const msg = event.data;
        if (!msg) return;

        if (msg.type === "progress") {
          const p = msg.progress;
          if (typeof p.workerIndex === "number") {
            trialsByWorker[p.workerIndex] = p.trialsUsed;
          }
          latestMeta = {
            k: p.k,
            maxFlips: p.maxFlips,
            mode: p.mode,
            eligibleCount: p.eligibleCount,
          };
          void reportAggregate();
          return;
        }

        if (msg.type === "found") {
          trialsByWorker[msg.workerIndex] = msg.result.trialsUsed;
          const trialsUsed = trialsByWorker.reduce((a, b) => a + b, 0);
          foundResult = {
            ...msg.result,
            trialsUsed,
          };
          finish(foundResult);
          return;
        }

        if (msg.type === "done") {
          doneCount += 1;
          if (doneCount >= workerCount) {
            finish(null);
          }
          return;
        }

        if (msg.type === "error") {
          rejectError = new Error(msg.message);
          fail(rejectError);
        }
      };

      worker.onerror = (event) => {
        fail(new Error(event.message || "Collision worker failed"));
      };

      const startMsg: CollisionWorkerInMessage = {
        type: "start",
        mode: "uniform",
        matrix: serialized,
        originalPayload,
        maxFlips,
        maxTrials,
        maxExhaustive,
        seed,
        workerIndex: i,
        workerCount,
      };
      worker.postMessage(startMsg);
    }
  });
}

/** Main-thread options helper when callers already have a decode fn. */
export type { BruteForceCollisionOptions };
