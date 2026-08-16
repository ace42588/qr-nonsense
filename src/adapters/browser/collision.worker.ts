/**
 * Web Worker entry for sharded collision search (uniform or targeted).
 */

import {
  findBruteForceCollision,
  findTargetedCollision,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
  type SerializedRsBlock,
} from "@/domain/qr/solver";
import type { QRMatrix, QRModule } from "@/domain/shared/types";
import { decodeMatrixPayloadOffscreen } from "./decodeMatrixPayloadOffscreen";
import { attachModuleIndex } from "@/domain/qr/matrix/utils";

export interface CollisionWorkerStartMessage {
  type: "start";
  mode?: "uniform" | "targeted";
  matrix: QRModule[][];
  originalPayload: string;
  maxFlips: number;
  maxTrials: number;
  maxExhaustive: number;
  seed: number;
  workerIndex: number;
  workerCount: number;
  /** Targeted mode */
  ecCodewordsPerBlock?: number;
  serializedBlocks?: SerializedRsBlock[];
  segmentTypesBySourceId?: Record<string, string>;
  charSeedFlipSets?: string[][];
}

export type CollisionWorkerInMessage = CollisionWorkerStartMessage;

export type CollisionWorkerOutMessage =
  | { type: "progress"; progress: BruteForceCollisionProgress }
  | {
      type: "found";
      result: BruteForceCollisionResult;
      workerIndex: number;
    }
  | { type: "done"; workerIndex: number }
  | { type: "error"; message: string; workerIndex?: number };

function asMatrix(rows: QRModule[][]): QRMatrix {
  const matrix = rows as QRMatrix;
  return attachModuleIndex(matrix, true) as QRMatrix;
}

type WorkerScope = {
  onmessage: ((event: MessageEvent<CollisionWorkerInMessage>) => void) | null;
  postMessage: (message: CollisionWorkerOutMessage) => void;
};

const ctx = self as unknown as WorkerScope;

ctx.onmessage = async (event: MessageEvent<CollisionWorkerInMessage>) => {
  const msg = event.data;
  if (!msg || msg.type !== "start") return;

  try {
    const matrix = asMatrix(msg.matrix);
    const decode = decodeMatrixPayloadOffscreen;
    const onProgress = (progress: BruteForceCollisionProgress) => {
      const out: CollisionWorkerOutMessage = { type: "progress", progress };
      ctx.postMessage(out);
    };

    let result: BruteForceCollisionResult | null;

    if (msg.mode === "targeted") {
      result = await findTargetedCollision({
        matrix,
        originalPayload: msg.originalPayload,
        decode,
        serializedBlocks: msg.serializedBlocks,
        segmentTypesBySourceId: msg.segmentTypesBySourceId,
        charSeedFlipSets: msg.charSeedFlipSets ?? [],
        ecCodewordsPerBlock: msg.ecCodewordsPerBlock ?? 0,
        maxFlips: msg.maxFlips,
        maxTrials: msg.maxTrials,
        maxExhaustive: msg.maxExhaustive,
        seed: msg.seed,
        workerIndex: msg.workerIndex,
        workerCount: msg.workerCount,
        onProgress,
      });
    } else {
      result = await findBruteForceCollision({
        matrix,
        originalPayload: msg.originalPayload,
        decode,
        maxFlips: msg.maxFlips,
        maxTrials: msg.maxTrials,
        maxExhaustive: msg.maxExhaustive,
        seed: msg.seed,
        workerIndex: msg.workerIndex,
        workerCount: msg.workerCount,
        onProgress,
      });
    }

    if (result) {
      const out: CollisionWorkerOutMessage = {
        type: "found",
        result,
        workerIndex: msg.workerIndex,
      };
      ctx.postMessage(out);
    } else {
      const out: CollisionWorkerOutMessage = {
        type: "done",
        workerIndex: msg.workerIndex,
      };
      ctx.postMessage(out);
    }
  } catch (err) {
    const out: CollisionWorkerOutMessage = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
      workerIndex: msg.workerIndex,
    };
    ctx.postMessage(out);
  }
};
