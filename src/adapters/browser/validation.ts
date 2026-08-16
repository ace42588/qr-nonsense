/**
 * Browser-based QR code validation adapter
 * Uses browser APIs (canvas, jsQR) to validate QR code scannability
 */

import jsQR from "jsqr";
import { QRMatrix } from "@/domain/shared/types";
import type { ImageData as DomainImageData } from "@/domain/image";
import type {
  DecodeTrialResult,
  EvaluateDecodePort,
} from "@/domain/evaluate";
import {
  MATRIX_RENDER_SIZE,
  paintMatrixToContext,
  renderMatrixToImageData,
} from "./renderMatrix";

/**
 * Deterministic pseudo-random number generator for consistent perturbations
 * Uses a simple linear congruential generator seeded by trial index
 */
function deterministicRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function renderMatrixToCanvas(matrix: QRMatrix): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = MATRIX_RENDER_SIZE;
  canvas.height = MATRIX_RENDER_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (!paintMatrixToContext(ctx, matrix)) return null;
  return canvas;
}

function decodeImageDataOnce(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  try {
    const code = jsQR(data, width, height);
    return code?.data ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Decode a QR matrix once with jsQR (no perturbations). Returns payload text or null.
 */
export async function decodeMatrixPayload(
  matrix: QRMatrix
): Promise<string | null> {
  const buffer = renderMatrixToImageData(matrix);
  if (!buffer) return null;
  return decodeImageDataOnce(buffer.data, buffer.width, buffer.height);
}

/**
 * Decode raw ImageData with jsQR (expects quiet zone already present).
 */
export async function decodeRenderedImageData(
  image: DomainImageData
): Promise<string | null> {
  return decodeImageDataOnce(image.data, image.width, image.height);
}

/**
 * Run decode trials with optional perturbations; returns per-trial results.
 */
export async function decodeMatrixTrials(
  matrix: QRMatrix,
  trials: number
): Promise<DecodeTrialResult[]> {
  const canvas = renderMatrixToCanvas(matrix);
  if (!canvas) {
    return Array.from({ length: trials }, () => ({
      success: false,
      payload: null,
    }));
  }

  const size = canvas.width;
  const usePerturbations = trials > 1;
  const results: DecodeTrialResult[] = [];

  for (let trial = 0; trial < trials; trial++) {
    const trialCanvas = document.createElement("canvas");
    trialCanvas.width = size;
    trialCanvas.height = size;
    const trialCtx = trialCanvas.getContext("2d");
    if (!trialCtx) {
      results.push({ success: false, payload: null });
      continue;
    }

    trialCtx.imageSmoothingEnabled = false;
    trialCtx.fillStyle = "white";
    trialCtx.fillRect(0, 0, size, size);

    if (usePerturbations && typeof trialCtx.save === "function") {
      const rand = deterministicRandom(trial);
      const scale = 0.9 + rand() * 0.2;
      const rotation = (rand() - 0.5) * 0.1;
      const blur = rand() < 0.3 ? 0.5 : 0;

      trialCtx.save();
      trialCtx.translate(size / 2, size / 2);
      trialCtx.rotate(rotation);
      trialCtx.scale(scale, scale);
      trialCtx.translate(-size / 2, -size / 2);

      if (blur > 0 && "filter" in trialCtx) {
        trialCtx.filter = `blur(${blur}px)`;
      }
      trialCtx.drawImage(canvas, 0, 0);
      trialCtx.restore();
    } else {
      trialCtx.drawImage(canvas, 0, 0);
    }

    const imageData = trialCtx.getImageData(0, 0, size, size);
    const payload = decodeImageDataOnce(
      imageData.data,
      imageData.width,
      imageData.height
    );
    results.push({
      success: payload != null && payload.length > 0,
      payload,
    });
  }

  return results;
}

/**
 * Decode rendered ImageData across trials (no geometry perturbations when trials=1).
 */
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

/**
 * Validate QR code can be decoded with light perturbations using jsQR
 * @returns Success rate (0.0 to 1.0) of successful decodes
 */
export async function validateDecode(
  matrix: QRMatrix,
  trials: number
): Promise<number> {
  const results = await decodeMatrixTrials(matrix, trials);
  if (results.length === 0) return 0;
  return results.filter((r) => r.success).length / results.length;
}

/** Decode port for evaluateGeneratedQr (DIP). */
export function createBrowserEvaluateDecodePort(): EvaluateDecodePort {
  return {
    decodeMatrixTrials,
    decodeImageData: decodeImageDataTrials,
  };
}
