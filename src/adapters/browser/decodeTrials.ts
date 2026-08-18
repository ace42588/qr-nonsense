/**
 * Decode-trial canvas logic that works with OffscreenCanvas or DOM canvas.
 */

import jsQR from "jsqr";
import type { QRMatrix } from "@/domain/shared/types";
import type { DecodeTrialResult } from "@/domain/evaluate";
import {
  MATRIX_RENDER_SIZE,
  paintMatrixToContext,
} from "./renderMatrix";
import { create2dCanvas } from "./canvasPort";

function deterministicRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function decodeImageDataOnce(
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

type TrialContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function applyTrialDraw(
  trialCtx: TrialContext,
  sourceCanvas: OffscreenCanvas | HTMLCanvasElement,
  size: number,
  trial: number,
  usePerturbations: boolean
): void {
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
      (trialCtx as CanvasRenderingContext2D).filter = `blur(${blur}px)`;
    }
    trialCtx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);
    trialCtx.restore();
  } else {
    trialCtx.drawImage(sourceCanvas as CanvasImageSource, 0, 0);
  }
}

export async function decodeMatrixTrialsOnCanvas(
  matrix: QRMatrix,
  trials: number
): Promise<DecodeTrialResult[]> {
  let source: ReturnType<typeof create2dCanvas>;
  try {
    source = create2dCanvas(MATRIX_RENDER_SIZE, MATRIX_RENDER_SIZE);
  } catch {
    return Array.from({ length: trials }, () => ({
      success: false,
      payload: null,
    }));
  }

  if (!paintMatrixToContext(source.ctx, matrix)) {
    return Array.from({ length: trials }, () => ({
      success: false,
      payload: null,
    }));
  }

  const size = MATRIX_RENDER_SIZE;
  const usePerturbations = trials > 1;
  const results: DecodeTrialResult[] = [];

  for (let trial = 0; trial < trials; trial++) {
    let trialCanvas: ReturnType<typeof create2dCanvas>;
    try {
      trialCanvas = create2dCanvas(size, size);
    } catch {
      results.push({ success: false, payload: null });
      continue;
    }

    applyTrialDraw(
      trialCanvas.ctx,
      source.canvas,
      size,
      trial,
      usePerturbations
    );

    const imageData = trialCanvas.ctx.getImageData(0, 0, size, size);
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
