/**
 * Visual fidelity between QR matrix polarity and target brightness grid.
 */

import type { QRMatrix } from "@/domain/shared/types";
import type { VisualFidelityResult } from "./types";

/**
 * Compute visual error between QR matrix and target image.
 * Only considers controllable modules (data + EC, not reserved patterns).
 */
export function computeVisualError(
  matrix: QRMatrix,
  targetGrid: Float32Array,
  qrDimension: number
): number {
  return computeVisualFidelity(matrix, targetGrid, qrDimension).meanAbsoluteError;
}

/**
 * Full visual fidelity: MAE, polarity agreement, optional contrast-weighted error.
 */
export function computeVisualFidelity(
  matrix: QRMatrix,
  targetGrid: Float32Array,
  qrDimension: number,
  contrastGrid?: Float32Array
): VisualFidelityResult {
  let totalError = 0;
  let weightedError = 0;
  let weightSum = 0;
  let mismatchCount = 0;
  let count = 0;

  for (let y = 0; y < qrDimension; y++) {
    for (let x = 0; x < qrDimension; x++) {
      const module = matrix[y]?.[x];
      if (!module || module.nonData) continue;

      const idx = y * qrDimension + x;
      const targetBrightness = targetGrid[idx];
      const actualBrightness = module.isDark ? 0 : 1;
      const error = Math.abs(targetBrightness - actualBrightness);
      totalError += error;
      count++;

      const targetDark = targetBrightness < 0.5;
      if (targetDark !== !!module.isDark) {
        mismatchCount++;
      }

      if (contrastGrid) {
        const w = Math.max(0, contrastGrid[idx]);
        weightedError += error * w;
        weightSum += w;
      }
    }
  }

  if (count === 0) {
    return {
      meanAbsoluteError: Infinity,
      polarityAgreement: 0,
      contrastWeightedError: contrastGrid ? Infinity : null,
      mismatchCount: 0,
      controllableModules: 0,
    };
  }

  return {
    meanAbsoluteError: totalError / count,
    polarityAgreement: 1 - mismatchCount / count,
    contrastWeightedError:
      contrastGrid && weightSum > 0 ? weightedError / weightSum : null,
    mismatchCount,
    controllableModules: count,
  };
}
