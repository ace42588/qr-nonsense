/**
 * Module-level Otsu binarization of a color image for IS-QR target bits.
 */

import { getBrightness, rasterizeImageToQRGrid, type ImageData } from "../image";
import { otsuThreshold } from "./segmentation";

/**
 * Build a module brightness grid (0–1) then Otsu-binarize to 0/1 targets
 * suitable as a QArt-style target grid (dark=0, light=1).
 */
export function computeModuleBinaryTarget(
  imageData: ImageData,
  qrDimension: number
): Float32Array {
  const brightness = rasterizeImageToQRGrid(imageData, qrDimension);
  // rasterizeImageToQRGrid returns 0–1 brightness (verify)
  // Check domain: sampling uses getBrightness/255 typically
  const threshold = otsuThreshold(brightness);
  const binary = new Float32Array(qrDimension * qrDimension);
  for (let i = 0; i < binary.length; i++) {
    binary[i] = brightness[i] >= threshold ? 1 : 0;
  }
  return binary;
}

/**
 * Grayscale luminance ImageData (RGB equal) for metrics / debug.
 */
export function toGrayscaleImageData(imageData: ImageData): ImageData {
  const out = new ImageData(imageData.width, imageData.height);
  const src = imageData.data;
  const dst = out.data;
  for (let i = 0; i < src.length; i += 4) {
    const y = getBrightness(src[i], src[i + 1], src[i + 2]);
    dst[i] = y;
    dst[i + 1] = y;
    dst[i + 2] = y;
    dst[i + 3] = src[i + 3] ?? 255;
  }
  return out;
}
