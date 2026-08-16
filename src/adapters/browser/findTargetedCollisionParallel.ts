/**
 * Parallel targeted collision search via Vite Web Workers.
 * First worker to find a collision terminates the rest.
 */

import {
  findTargetedCollision,
  enumerateCharacterChangeCandidates,
  serializeRsBlocks,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
} from "@/domain/qr/solver";
import type { QRMatrix, QRModule, Segment } from "@/domain/shared/types";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { Input } from "@/state/inputs/types";
import { buildSegmentTypesBySourceId } from "@/domain/qr/corruption";
import { decodeMatrixPayload } from "./validation";
import type {
  CollisionWorkerInMessage,
  CollisionWorkerOutMessage,
} from "./collision.worker";
import {
  clampWorkerCount,
  serializeMatrixForWorker,
} from "./findBruteForceCollisionParallel";

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

function canUseWorkers(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof URL !== "undefined"
  );
}

function buildCharSeedFlipSets(
  options: ParallelTargetedCollisionOptions
): string[][] {
  const limit = options.charSeedLimit ?? 20;
  try {
    const candidates = enumerateCharacterChangeCandidates(
      {
        inputs: options.inputs,
        version: options.version,
        errorCorrectionLevel: options.errorCorrectionLevel,
        ecCodewordsPerBlock: options.ecCodewordsPerBlock,
        blocks: options.blocks,
        matrix: options.matrix,
        maxAlternativesPerChar:
          options.inputs.some((i) => i.mode === "byte") ? 60 : undefined,
      },
      limit
    );
    return candidates
      .map((c) => c.flipModuleIds)
      .filter((ids) => ids?.length > 0);
  } catch {
    return [];
  }
}

/**
 * Run targeted collision search across Vite workers.
 * Falls back to main-thread findTargetedCollision when workers unavailable.
 */
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

  const charSeedFlipSets = buildCharSeedFlipSets(options);
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

  const serialized = serializeMatrixForWorker(matrix);
  const workers: Worker[] = [];
  const trialsByWorker = new Array<number>(workerCount).fill(0);
  let latestMeta: Pick<
    BruteForceCollisionProgress,
    "k" | "maxFlips" | "mode" | "eligibleCount" | "phase"
  > = {
    k: 1,
    maxFlips,
    mode: "exhaustive",
    eligibleCount: 0,
    phase: "format",
  };

  let settled = false;

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
      phase: latestMeta.phase,
      workerCount,
    });
  };

  return new Promise<BruteForceCollisionResult | null>((resolve, reject) => {
    let doneCount = 0;

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
        findTargetedCollision({
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
            phase: p.phase,
          };
          void reportAggregate();
          return;
        }

        if (msg.type === "found") {
          trialsByWorker[msg.workerIndex] = msg.result.trialsUsed;
          const trialsUsed = trialsByWorker.reduce((a, b) => a + b, 0);
          finish({
            ...msg.result,
            trialsUsed,
          });
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
          fail(new Error(msg.message));
        }
      };

      worker.onerror = (event) => {
        fail(new Error(event.message || "Collision worker failed"));
      };

      const startMsg: CollisionWorkerInMessage = {
        type: "start",
        mode: "targeted",
        matrix: serialized,
        originalPayload,
        maxFlips,
        maxTrials,
        maxExhaustive,
        seed,
        workerIndex: i,
        workerCount,
        ecCodewordsPerBlock,
        serializedBlocks,
        segmentTypesBySourceId,
        charSeedFlipSets,
      };
      worker.postMessage(startMsg);
    }
  });
}

export type { QRModule };
