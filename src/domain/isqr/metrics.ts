/**
 * Full-reference image quality metrics for IS-QR validation:
 * MSE, PSNR, SSIM, FSIM, GMSD.
 */

import { getBrightness, type ImageData } from "../image/sampling";

export interface ImageQualityMetrics {
  mse: number;
  psnr: number;
  ssim: number;
  fsim: number;
  gmsd: number;
}

function lumaAt(data: Uint8ClampedArray, i: number): number {
  return getBrightness(data[i], data[i + 1], data[i + 2]);
}

function assertSameSize(a: ImageData, b: ImageData): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `Image size mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`
    );
  }
}

/** Mean squared error on luminance (0–255). */
export function computeMse(ref: ImageData, dist: ImageData): number {
  assertSameSize(ref, dist);
  const n = ref.width * ref.height;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = lumaAt(ref.data, i * 4) - lumaAt(dist.data, i * 4);
    sum += d * d;
  }
  return sum / n;
}

/** Peak signal-to-noise ratio (dB). Infinity if identical. */
export function computePsnr(ref: ImageData, dist: ImageData, peak = 255): number {
  const mse = computeMse(ref, dist);
  if (mse <= 1e-12) return Infinity;
  return 10 * Math.log10((peak * peak) / mse);
}

/**
 * Mean SSIM (Wang et al.) over 8×8 windows, luminance only.
 */
export function computeSsim(ref: ImageData, dist: ImageData): number {
  assertSameSize(ref, dist);
  const w = ref.width;
  const h = ref.height;
  const win = 8;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;

  let ssimSum = 0;
  let count = 0;

  for (let y = 0; y <= h - win; y += win) {
    for (let x = 0; x <= w - win; x += win) {
      let sumX = 0;
      let sumY = 0;
      let sumXX = 0;
      let sumYY = 0;
      let sumXY = 0;
      const n = win * win;
      for (let dy = 0; dy < win; dy++) {
        for (let dx = 0; dx < win; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          const xv = lumaAt(ref.data, idx);
          const yv = lumaAt(dist.data, idx);
          sumX += xv;
          sumY += yv;
          sumXX += xv * xv;
          sumYY += yv * yv;
          sumXY += xv * yv;
        }
      }
      const muX = sumX / n;
      const muY = sumY / n;
      const sigmaX = sumXX / n - muX * muX;
      const sigmaY = sumYY / n - muY * muY;
      const sigmaXY = sumXY / n - muX * muY;
      const num = (2 * muX * muY + C1) * (2 * sigmaXY + C2);
      const den = (muX * muX + muY * muY + C1) * (sigmaX + sigmaY + C2);
      ssimSum += num / den;
      count++;
    }
  }
  return count > 0 ? ssimSum / count : 1;
}

function sobelMagnitude(
  luma: Float32Array,
  w: number,
  h: number
): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -luma[i - w - 1] +
        luma[i - w + 1] -
        2 * luma[i - 1] +
        2 * luma[i + 1] -
        luma[i + w - 1] +
        luma[i + w + 1];
      const gy =
        -luma[i - w - 1] -
        2 * luma[i - w] -
        luma[i - w + 1] +
        luma[i + w - 1] +
        2 * luma[i + w] +
        luma[i + w + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function toLumaBuffer(img: ImageData): Float32Array {
  const n = img.width * img.height;
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = lumaAt(img.data, i * 4);
  }
  return buf;
}

/**
 * Simplified FSIM (feature similarity) using phase-congruency proxy via
 * gradient magnitude similarity + luminance (Zhang et al. approximation).
 */
export function computeFsim(ref: ImageData, dist: ImageData): number {
  assertSameSize(ref, dist);
  const w = ref.width;
  const h = ref.height;
  const lr = toLumaBuffer(ref);
  const ld = toLumaBuffer(dist);
  const gr = sobelMagnitude(lr, w, h);
  const gd = sobelMagnitude(ld, w, h);
  const T1 = 0.85;
  const T2 = 160;
  let num = 0;
  let den = 0;
  for (let i = 0; i < lr.length; i++) {
    const gmMax = Math.max(gr[i], gd[i]);
    if (gmMax < 1e-6) continue;
    const sPc = (2 * gr[i] * gd[i] + T1) / (gr[i] * gr[i] + gd[i] * gd[i] + T1);
    const sG = (2 * lr[i] * ld[i] + T2) / (lr[i] * lr[i] + ld[i] * ld[i] + T2);
    const s = sPc * sG;
    num += s * gmMax;
    den += gmMax;
  }
  return den > 0 ? num / den : 1;
}

/**
 * Gradient Magnitude Similarity Deviation (Xue et al.).
 * Lower is better (0 = identical).
 */
export function computeGmsd(ref: ImageData, dist: ImageData): number {
  assertSameSize(ref, dist);
  const w = ref.width;
  const h = ref.height;
  const lr = toLumaBuffer(ref);
  const ld = toLumaBuffer(dist);
  const gr = sobelMagnitude(lr, w, h);
  const gd = sobelMagnitude(ld, w, h);
  const c = 170;
  const gms: number[] = [];
  for (let i = 0; i < lr.length; i++) {
    if (i % w === 0 || i % w === w - 1) continue;
    const y = (i / w) | 0;
    if (y === 0 || y === h - 1) continue;
    gms.push((2 * gr[i] * gd[i] + c) / (gr[i] * gr[i] + gd[i] * gd[i] + c));
  }
  if (gms.length === 0) return 0;
  let mean = 0;
  for (const v of gms) mean += v;
  mean /= gms.length;
  let varSum = 0;
  for (const v of gms) {
    const d = v - mean;
    varSum += d * d;
  }
  return Math.sqrt(varSum / gms.length);
}

/** Compute all representative IS-QR quality measures. */
export function computeImageQualityMetrics(
  reference: ImageData,
  distorted: ImageData
): ImageQualityMetrics {
  return {
    mse: computeMse(reference, distorted),
    psnr: computePsnr(reference, distorted),
    ssim: computeSsim(reference, distorted),
    fsim: computeFsim(reference, distorted),
    gmsd: computeGmsd(reference, distorted),
  };
}
