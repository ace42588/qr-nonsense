/**
 * Control matrix visualization for QArt
 * Shows which modules were successfully controlled during optimization
 */

import { QRMatrix, QRModule } from "../shared/types";

/**
 * Create control visualization matrix
 * Controlled modules: shown normally (black/white)
 * Uncontrolled modules: grayed out
 */
export function createControlMatrix(
  matrix: QRMatrix,
  controlledBits: Map<string, boolean>
): QRMatrix {
  const dimension = matrix.length;
  const controlMatrix: QRMatrix = [];

  for (let y = 0; y < dimension; y++) {
    controlMatrix[y] = [];
    for (let x = 0; x < dimension; x++) {
      const module = matrix[y][x];
      if (!module) {
        controlMatrix[y][x] = module;
        continue;
      }

      const bitId = module.bit?.id;
      const wasControlled = bitId ? controlledBits.get(bitId) : false;

      if (module.nonData) {
        // Non-data module - always gray it out
        const grayValue = 0x3f3f3f;
        controlMatrix[y][x] = {
          ...module,
          isDark: module.isDark,
        } as QRModule & { _controlGray?: number };
        (controlMatrix[y][x] as QRModule & { _controlGray?: number })._controlGray = grayValue;
      } else if (!wasControlled) {
        // Uncontrolled data module - gray it out
        const grayValue = 0xbfbfbf;
        controlMatrix[y][x] = {
          ...module,
          isDark: module.isDark,
        } as QRModule & { _controlGray?: number };
        (controlMatrix[y][x] as QRModule & { _controlGray?: number })._controlGray = grayValue;
      } else {
        // Controlled module - show actual value (no gray)
        // CRITICAL: Always create a copy to avoid mutating the original matrix
        // Even though we're showing the same visual value, we must not share references
        // Note: We still reference the same bit object, but that's okay since bit objects
        // are not mutated after QArt optimization completes. The control matrix is only
        // used for visualization, not for data regeneration.
        controlMatrix[y][x] = {
          ...module,
        };
      }
    }
  }

  return controlMatrix;
}

