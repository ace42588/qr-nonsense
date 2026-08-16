/**
 * Shared QR matrix → pixel buffer for jsQR (document canvas or OffscreenCanvas).
 */

import type { QRMatrix } from "@/domain/shared/types";

export const MATRIX_RENDER_SIZE = 400;
export const MATRIX_QUIET_ZONE = 4;

export interface MatrixPixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

type DrawContext = {
  imageSmoothingEnabled: boolean;
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, w: number, h: number): void;
  getImageData?(x: number, y: number, w: number, h: number): ImageData;
};

/**
 * Paint a QR matrix onto a 2d context (white quiet zone + hard B/W modules).
 * Returns false if the matrix is invalid.
 */
export function paintMatrixToContext(
  ctx: DrawContext,
  matrix: QRMatrix,
  size = MATRIX_RENDER_SIZE,
  quietZone = MATRIX_QUIET_ZONE
): boolean {
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return false;
  }
  const dimension = matrix.length;
  if (matrix.some((row) => !row || row.length !== dimension)) {
    return false;
  }

  const totalDimension = dimension + quietZone * 2;
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
  return true;
}

/**
 * Render matrix to ImageData via HTMLCanvasElement (DOM).
 */
export function renderMatrixToImageData(
  matrix: QRMatrix,
  size = MATRIX_RENDER_SIZE
): MatrixPixelBuffer | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (!paintMatrixToContext(ctx, matrix, size)) return null;
  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };
}

/**
 * Render matrix to ImageData via OffscreenCanvas (workers).
 */
export function renderMatrixToImageDataOffscreen(
  matrix: QRMatrix,
  size = MATRIX_RENDER_SIZE
): MatrixPixelBuffer | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (!paintMatrixToContext(ctx as unknown as DrawContext, matrix, size)) {
    return null;
  }
  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };
}
