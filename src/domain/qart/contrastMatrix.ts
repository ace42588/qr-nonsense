/**
 * Contrast matrix visualization for QArt
 * Shows contrast (variance) values as a heatmap overlay
 */

import { QRMatrix, QRModule } from "../shared/types";

/**
 * Create contrast visualization matrix
 * Modules are colored based on their contrast (variance) values
 * High contrast = brighter colors, low contrast = darker colors
 */
export function createContrastMatrix(
  matrix: QRMatrix,
  contrastGrid: Float32Array
): QRMatrix {
  const dimension = matrix.length;
  const contrastMatrix: QRMatrix = [];

  // Find min and max contrast values for normalization
  let minContrast = Infinity;
  let maxContrast = -Infinity;
  for (let i = 0; i < contrastGrid.length; i++) {
    const contrast = contrastGrid[i];
    if (contrast < minContrast) minContrast = contrast;
    if (contrast > maxContrast) maxContrast = contrast;
  }

  // Avoid division by zero
  const contrastRange = maxContrast - minContrast;
  const normalizeContrast = (contrast: number): number => {
    if (contrastRange === 0) return 0;
    return (contrast - minContrast) / contrastRange;
  };

  for (let y = 0; y < dimension; y++) {
    contrastMatrix[y] = [];
    for (let x = 0; x < dimension; x++) {
      const module = matrix[y][x];
      if (!module) {
        contrastMatrix[y][x] = module;
        continue;
      }

      const contrast = contrastGrid[y * dimension + x];
      const normalized = normalizeContrast(contrast);

      // Create a heatmap: high contrast = bright yellow/white, low contrast = dark blue/black
      // Use a color scale: dark blue (low) -> cyan -> yellow -> white (high)
      let r: number, g: number, b: number;
      if (normalized < 0.33) {
        // Low contrast: dark blue to cyan
        const t = normalized / 0.33;
        r = Math.floor(t * 0);
        g = Math.floor(t * 128);
        b = Math.floor(128 + t * 127);
      } else if (normalized < 0.66) {
        // Medium contrast: cyan to yellow
        const t = (normalized - 0.33) / 0.33;
        r = Math.floor(t * 255);
        g = Math.floor(128 + t * 127);
        b = Math.floor(255 - t * 255);
      } else {
        // High contrast: yellow to white
        const t = (normalized - 0.66) / 0.34;
        r = 255;
        g = Math.floor(255 - t * 0);
        b = Math.floor(0 + t * 255);
      }

      const rgbValue = (r << 16) | (g << 8) | b;

      contrastMatrix[y][x] = {
        ...module,
        isDark: module.isDark,
      } as QRModule & { _contrastColor?: number };
      (contrastMatrix[y][x] as QRModule & { _contrastColor?: number })._contrastColor = rgbValue;
    }
  }

  return contrastMatrix;
}

