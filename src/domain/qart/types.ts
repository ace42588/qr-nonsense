/**
 * Type definitions for QArt basis matrix and generation options.
 */

import type { Segment, QRMatrix, Codeword, VersionInfo } from "../shared/types";
import type { QRBlock } from "../qr/codewords/blocks";
import type { PriorityFunctionType } from "./bitPriority";
import type { ReedSolomonEncoder } from "../qr/reedsolomon";

/**
 * Block basis matrix state for QArt optimization
 * Tracks which bits can be controlled while maintaining Reed-Solomon correctness
 */
export interface BlockBasisState {
  B: Uint8ClampedArray; // Current data + EC bytes
  M: Uint8ClampedArray[]; // Basis matrix: M[i] shows effect of flipping data bit i
  savedM: Uint8ClampedArray[]; // Saved rows that have already been used (like Go's m[len(m):cap(m)])
  encoder: ReedSolomonEncoder;
  dataBytes: Uint8ClampedArray; // Reference to data bytes (will be updated)
  ecBytes: Uint8ClampedArray; // Reference to EC bytes (will be updated)
  paddingByteIndices?: Set<number>; // Indices of data bytes that are entirely padding (optional, for safety checks)
  _rejectionCount?: number; // Internal counter for debugging rejections
}

export interface QArtAppendData {
  enabled: boolean;
  method: "existing" | "new";
  separator?: string;
  encodingMode?: "numeric" | "alphanumeric" | "byte";
}

export interface QArtOptimizedAppendData {
  segments: Segment[];
  originalText: string;
  encodingMode: string;
}

export interface QArtOptions {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  initialMatrix: QRMatrix;
  versionInfo: VersionInfo;
  errorCorrectionLevel: number;
  targetImage: ImageData;
  signal?: AbortSignal;
  priorityFunction?: PriorityFunctionType;
  appendData?: QArtAppendData;
  sourceImage?: HTMLImageElement | ImageBitmap | ImageData;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  minDecodeRedundancy?: number;
  decodeTrials?: number;
  roiGrid?: Float32Array;
  targetGridOverride?: Float32Array;
}

export interface QArtResult {
  matrix: QRMatrix;
  dataMask: number;
  segments: Segment[];
  error: number;
  decodeSuccessRate: number;
  controlMatrix?: QRMatrix;
  contrastGrid?: Float32Array;
  optimizedAppendData?: QArtOptimizedAppendData;
  offscreenCanvasImage?: ImageData;
  evaluation?: import("@/domain/evaluate").EvaluationReport;
  scannabilityWarning?: string | null;
}
