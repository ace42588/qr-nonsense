/**
 * EvaluateDecodePort implementations (DOM / Offscreen / worker-safe).
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
import { renderMatrixToImageData } from "./renderMatrix";

export async function decodeRenderedImageData(
  image: DomainImageData
): Promise<string | null> {
  return decodeImageDataOnce(image.data, image.width, image.height);
}

export async function decodeImageDataTrials(
  image: DomainImageData,
  trials: number
): Promise<DecodeTrialResult[]> {
  const results: DecodeTrialResult[] = [];
  for (let i = 0; i < trials; i++) {
    const payload = await decodeRenderedImageData(image);
    results.push({
      success: payload != null && payload.length > 0,
      payload,
    });
  }
  return results;
}

export async function decodeMatrixPayload(
  matrix: QRMatrix
): Promise<string | null> {
  const buffer = renderMatrixToImageData(matrix);
  if (!buffer) {
    const { renderMatrixToImageDataOffscreen } = await import("./renderMatrix");
    const off = renderMatrixToImageDataOffscreen(matrix);
    if (!off) return null;
    return decodeImageDataOnce(off.data, off.width, off.height);
  }
  return decodeImageDataOnce(buffer.data, buffer.width, buffer.height);
}

export function createBrowserEvaluateDecodePort(): EvaluateDecodePort {
  return {
    decodeMatrixTrials: decodeMatrixTrialsOnCanvas,
    decodeImageData: decodeImageDataTrials,
  };
}

export function createOffscreenEvaluateDecodePort(): EvaluateDecodePort {
  return {
    decodeMatrixTrials: decodeMatrixTrialsOnCanvas,
    decodeImageData: decodeImageDataTrials,
  };
}
