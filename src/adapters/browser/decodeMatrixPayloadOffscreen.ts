/**
 * OffscreenCanvas + jsQR decode for Web Worker contexts (no `document`).
 */

import jsQR from "jsqr";
import { QRMatrix } from "@/domain/shared/types";

function renderMatrixToOffscreen(
  matrix: QRMatrix
): OffscreenCanvas | null {
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return null;
  }

  const dimension = matrix.length;
  if (matrix.some((row) => !row || row.length !== dimension)) {
    return null;
  }

  if (typeof OffscreenCanvas === "undefined") {
    return null;
  }

  const quietZone = 4;
  const totalDimension = dimension + quietZone * 2;
  const size = 400;
  const canvas = new OffscreenCanvas(size, size);
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
 * Decode a QR matrix once with jsQR via OffscreenCanvas. Returns payload or null.
 */
export async function decodeMatrixPayloadOffscreen(
  matrix: QRMatrix
): Promise<string | null> {
  const canvas = renderMatrixToOffscreen(matrix);
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
