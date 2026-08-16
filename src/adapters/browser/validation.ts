/**
 * Browser-based QR code validation adapter
 * Uses browser APIs (canvas, jsQR) to validate QR code scannability
 */

import jsQR from "jsqr";
import { QRMatrix } from "@/domain/shared/types";

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
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return null;
  }

  const dimension = matrix.length;
  if (matrix.some((row) => !row || row.length !== dimension)) {
    return null;
  }

  // QR codes require a quiet zone (white border) of at least 4 modules on all sides
  const quietZone = 4;
  const totalDimension = dimension + quietZone * 2;
  const canvas = document.createElement("canvas");
  const size = 400; // Render at high resolution for better decode
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, size);

  const moduleSize = size / totalDimension;
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const module = matrix[y]?.[x];
      if (!module) continue;

      const moduleX = Math.round((x + quietZone) * moduleSize);
      const moduleY = Math.round((y + quietZone) * moduleSize);
      const moduleWidth =
        Math.round((x + quietZone + 1) * moduleSize) - moduleX;
      const moduleHeight =
        Math.round((y + quietZone + 1) * moduleSize) - moduleY;

      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleWidth, moduleHeight);
    }
  }

  return canvas;
}

/**
 * Decode a QR matrix once with jsQR (no perturbations). Returns payload text or null.
 */
export async function decodeMatrixPayload(
  matrix: QRMatrix
): Promise<string | null> {
  const canvas = renderMatrixToCanvas(matrix);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Validate QR code can be decoded with light perturbations using jsQR
 *
 * This function:
 * 1. Renders the QR matrix to a canvas
 * 2. Applies perturbations (scale variations, slight blur, rotation)
 * 3. Attempts decode with jsQR
 * 4. Returns success rate
 *
 * @param matrix - The QR code matrix to validate
 * @param trials - Number of decode attempts. If 1, no perturbations are applied.
 * @returns Success rate (0.0 to 1.0) of successful decodes
 */
export async function validateDecode(
  matrix: QRMatrix,
  trials: number
): Promise<number> {
  const canvas = renderMatrixToCanvas(matrix);
  if (!canvas) return 0;

  const size = canvas.width;
  let successCount = 0;
  const usePerturbations = trials > 1;

  for (let trial = 0; trial < trials; trial++) {
    const trialCanvas = document.createElement("canvas");
    trialCanvas.width = size;
    trialCanvas.height = size;
    const trialCtx = trialCanvas.getContext("2d");
    if (!trialCtx) continue;

    trialCtx.imageSmoothingEnabled = false;
    trialCtx.fillStyle = "white";
    trialCtx.fillRect(0, 0, size, size);

    if (usePerturbations) {
      const rand = deterministicRandom(trial);
      const scale = 0.9 + rand() * 0.2; // 0.9 to 1.1
      const rotation = (rand() - 0.5) * 0.1; // ±0.05 radians (~±3 degrees)
      const blur = rand() < 0.3 ? 0.5 : 0; // 30% chance of slight blur

      trialCtx.save();
      trialCtx.translate(size / 2, size / 2);
      trialCtx.rotate(rotation);
      trialCtx.scale(scale, scale);
      trialCtx.translate(-size / 2, -size / 2);

      if (blur > 0) {
        trialCtx.filter = `blur(${blur}px)`;
      }
      trialCtx.drawImage(canvas, 0, 0);
      trialCtx.restore();
    } else {
      trialCtx.drawImage(canvas, 0, 0);
    }

    const imageData = trialCtx.getImageData(0, 0, size, size);

    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        successCount++;
      }
    } catch (error) {
      console.error(error);
      continue;
    }
  }

  return successCount / trials;
}

