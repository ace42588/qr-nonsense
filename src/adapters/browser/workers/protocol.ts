/**
 * Job protocol for the shared compute worker pool.
 * AbortSignal is not transferable — abort is a separate message by job id.
 */

import type { QRModule } from "@/domain/shared/types";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { BitPosition } from "@/domain/qart/bitPriority";
import type {
  SerializedRsBlock,
  BruteForceCollisionProgress,
  CharacterChangeSolverOptions,
} from "@/domain/qr/solver";
import type { DecodeTrialResult, ImageQualityMetrics } from "@/domain/evaluate";
import type { NodeParams } from "@/domain/pipeline/types";

export type JobType =
  | "runNodes"
  | "optimizeBlock"
  | "decodeImage"
  | "decodeMatrixTrials"
  | "collisionShard"
  | "transformImage"
  | "imageMetrics"
  | "importanceMap"
  | "charChangeSeeds"
  | "charChangeSolve";

export interface WorkerRunMessage {
  kind: "run";
  id: string;
  type: JobType;
  payload: unknown;
}

export interface WorkerAbortMessage {
  kind: "abort";
  id: string;
}

export type WorkerInMessage = WorkerRunMessage | WorkerAbortMessage;

export interface WorkerProgressMessage {
  kind: "progress";
  id: string;
  progress: unknown;
}

export interface WorkerResultMessage {
  kind: "result";
  id: string;
  result: unknown;
}

export interface WorkerErrorMessage {
  kind: "error";
  id: string;
  message: string;
  cancelled?: boolean;
}

export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

export interface SerializedGenerationContext {
  [key: string]: unknown;
  deferImageMetrics?: boolean;
}

export interface RunNodesPayload {
  nodeIds: string[];
  ctx: SerializedGenerationContext;
  params?: NodeParams;
  deferImageMetrics?: boolean;
}

export interface OptimizeBlockPayload {
  blockIndex: number;
  block: QRBlock;
  bitOrder: BitPosition[];
  valueGrid: Float32Array;
  dimension: number;
  ecCodewordsPerBlock: number;
  editableIndices: number[];
}

export interface OptimizeBlockResult {
  blockIndex: number;
  block: QRBlock;
  optimized: number;
  controlledBits: Array<[string, boolean]>;
}

export interface DecodeImagePayload {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Structured-cloneable jsQR result subset used by the scanner. */
export interface ScanDecodeResult {
  data: string;
  version?: number;
  chunks?: unknown[];
  formatInfo?: {
    errorCorrectionLevel?: number;
    dataMask?: number;
  };
}

export interface DecodeMatrixTrialsPayload {
  matrix: QRModule[][];
  trials: number;
}

export interface CollisionShardPayload {
  mode?: "uniform" | "targeted";
  matrix: QRModule[][];
  originalPayload: string;
  maxFlips: number;
  maxTrials: number;
  maxExhaustive: number;
  seed: number;
  workerIndex: number;
  workerCount: number;
  ecCodewordsPerBlock?: number;
  serializedBlocks?: SerializedRsBlock[];
  segmentTypesBySourceId?: Record<string, string>;
  charSeedFlipSets?: string[][];
}

export type CollisionShardProgress = BruteForceCollisionProgress;

export interface TransformImagePayload {
  /** ImageData pixels (preferred) or transferred ImageBitmap. */
  imageData?: { data: Uint8ClampedArray; width: number; height: number };
  bitmap?: ImageBitmap;
  canvasSize: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface ImageMetricsPayload {
  reference: { data: Uint8ClampedArray; width: number; height: number };
  rendered: { data: Uint8ClampedArray; width: number; height: number };
}

export interface ImportanceMapPayload {
  image: { data: Uint8ClampedArray; width: number; height: number };
  size: number;
  alpha: number;
}

export interface CharChangePayload {
  options: CharacterChangeSolverOptions;
  limit?: number;
}

export type { DecodeTrialResult, ImageQualityMetrics };
