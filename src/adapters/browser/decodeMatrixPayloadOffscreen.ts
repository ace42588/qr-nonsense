/**
 * OffscreenCanvas + jsQR decode for Web Worker contexts (no `document`).
 */

import jsQR from "jsqr";
import { QRMatrix } from "@/domain/shared/types";
import { renderMatrixToImageDataOffscreen } from "./renderMatrix";

/**
 * Decode a QR matrix once with jsQR via OffscreenCanvas. Returns payload or null.
 */
export async function decodeMatrixPayloadOffscreen(
  matrix: QRMatrix
): Promise<string | null> {
  const buffer = renderMatrixToImageDataOffscreen(matrix);
  if (!buffer) return null;

  try {
    const code = jsQR(buffer.data, buffer.width, buffer.height);
    return code?.data ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
