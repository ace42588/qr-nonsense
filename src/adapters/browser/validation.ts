/**
 * Browser-based QR code validation adapter
 * Uses canvas + jsQR to validate QR code scannability
 */

import type { QRMatrix } from "@/domain/shared/types";
import type { ImageData as DomainImageData } from "@/domain/image";
import type {
  DecodeTrialResult,
  EvaluateDecodePort,
} from "@/domain/evaluate";
import {
  decodeImageDataOnce,
  decodeMatrixTrialsOnCanvas,
} from "./decodeTrials";
import {
  createBrowserEvaluateDecodePort,
  decodeImageDataTrials,
  decodeMatrixPayload,
  decodeRenderedImageData,
} from "./decodePort";

export {
  decodeImageDataOnce,
  decodeMatrixTrialsOnCanvas as decodeMatrixTrials,
  decodeImageDataTrials,
  decodeMatrixPayload,
  decodeRenderedImageData,
  createBrowserEvaluateDecodePort,
};

export async function validateDecode(
  matrix: QRMatrix,
  trials: number
): Promise<number> {
  const results = await decodeMatrixTrialsOnCanvas(matrix, trials);
  if (results.length === 0) return 0;
  return results.filter((r) => r.success).length / results.length;
}

export type { DecodeTrialResult, EvaluateDecodePort, DomainImageData };
