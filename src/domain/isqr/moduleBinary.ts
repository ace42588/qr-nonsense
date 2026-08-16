/**
 * Module-level Otsu binarization of a color image for IS-QR target bits.
 */

import { rasterizeImageToQRGrid, type ImageData } from "../image";
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
  const threshold = otsuThreshold(brightness);
  const binary = new Float32Array(qrDimension * qrDimension);
  for (let i = 0; i < binary.length; i++) {
    binary[i] = brightness[i] >= threshold ? 1 : 0;
  }
  return binary;
}
