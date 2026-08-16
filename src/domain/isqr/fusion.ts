/**
 * ROI-weighted color fusion of QR modules with a full-color source image.
 */

import { getBrightness, mapQrCoordToImagePixel, type ImageData } from "../image/sampling";
import type { QRMatrix } from "../shared/types";

export interface FusionOptions {
  /** Per-module ROI fraction [0,1], length dimension² */
  roiGrid: Float32Array;
  /** Module pixel size for sub-sampling (default 3) */
  modulePixel?: number;
  /** Blend strength for QR polarity outside ROI (0–1, default 0.55) */
  qrBlend?: number;
  /** Center seed fraction of module for polarity (default 0.35) */
  centerSeed?: number;
}

function sampleImageRgb(
  image: ImageData,
  qrX: number,
  qrY: number,
  qrDimension: number
): { r: number; g: number; b: number } {
  const { x, y } = mapQrCoordToImagePixel(
    qrX,
    qrY,
    qrDimension,
    image.width,
    image.height
  );
  const i = (y * image.width + x) * 4;
  return {
    r: image.data[i],
    g: image.data[i + 1],
    b: image.data[i + 2],
  };
}

/**
 * Render fused IS-QR into ImageData of size (dimension * modulePixel)².
 * Structural (nonData) modules stay solid black/white; data modules blend
 * source color with polarity, preserving more color inside ROI.
 */
export function fuseColorQr(
  matrix: QRMatrix,
  sourceImage: ImageData,
  options: FusionOptions
): ImageData {
  const dimension = matrix.length;
  const modulePixel = options.modulePixel ?? 3;
  const qrBlend = options.qrBlend ?? 0.55;
  const centerSeed = options.centerSeed ?? 0.35;
  const { roiGrid } = options;
  const size = dimension * modulePixel;
  const out = new ImageData(size, size);
  const dst = out.data;

  for (let my = 0; my < dimension; my++) {
    for (let mx = 0; mx < dimension; mx++) {
      const m = matrix[my][mx];
      if (!m) continue;
      const dark = !!m.isDark;
      const roi = roiGrid[my * dimension + mx] ?? 0;
      const isStructural = !!m.nonData;

      for (let py = 0; py < modulePixel; py++) {
        for (let px = 0; px < modulePixel; px++) {
          const cx = (px + 0.5) / modulePixel;
          const cy = (py + 0.5) / modulePixel;
          const inCenter =
            Math.abs(cx - 0.5) < centerSeed / 2 &&
            Math.abs(cy - 0.5) < centerSeed / 2;

          const img = sampleImageRgb(
            sourceImage,
            mx + cx,
            my + cy,
            dimension
          );

          let r: number;
          let g: number;
          let b: number;

          if (isStructural) {
            const v = dark ? 0 : 255;
            r = g = b = v;
          } else {
            // Image fidelity rises with ROI; QR polarity enforced more outside ROI
            const polarityTarget = dark ? 0 : 255;
            const enforce =
              (inCenter ? 1 : 0.35) * qrBlend * (1 - 0.75 * roi);
            r = img.r * (1 - enforce) + polarityTarget * enforce;
            g = img.g * (1 - enforce) + polarityTarget * enforce;
            b = img.b * (1 - enforce) + polarityTarget * enforce;

            // Ensure center seed has enough contrast for scanners
            if (inCenter) {
              const y = getBrightness(r, g, b);
              if (dark && y > 90) {
                const t = 0.5;
                r = r * (1 - t);
                g = g * (1 - t);
                b = b * (1 - t);
              } else if (!dark && y < 165) {
                const t = 0.5;
                r = r * (1 - t) + 255 * t;
                g = g * (1 - t) + 255 * t;
                b = b * (1 - t) + 255 * t;
              }
            }
          }

          const ox = mx * modulePixel + px;
          const oy = my * modulePixel + py;
          const oi = (oy * size + ox) * 4;
          dst[oi] = Math.round(Math.max(0, Math.min(255, r)));
          dst[oi + 1] = Math.round(Math.max(0, Math.min(255, g)));
          dst[oi + 2] = Math.round(Math.max(0, Math.min(255, b)));
          dst[oi + 3] = 255;
        }
      }
    }
  }

  return out;
}

/**
 * Draw fused ImageData into a canvas 2D context at a module rectangle.
 * Used by QRBase renderModule for live display.
 */
export function sampleFusedModuleColor(
  fused: ImageData,
  mx: number,
  my: number,
  modulePixel: number
): { r: number; g: number; b: number } {
  const size = fused.width;
  const cx = Math.min(size - 1, mx * modulePixel + Math.floor(modulePixel / 2));
  const cy = Math.min(size - 1, my * modulePixel + Math.floor(modulePixel / 2));
  const i = (cy * size + cx) * 4;
  return {
    r: fused.data[i],
    g: fused.data[i + 1],
    b: fused.data[i + 2],
  };
}
