/**
 * Browser BlendMask approximation: FT saliency → Otsu → morphology → CC instances.
 */

import { getBrightness, mapQrCoordToImagePixel, type ImageData } from "../image/sampling";

export interface InstanceMaskResult {
  /** Per-pixel ROI mask in [0, 1] */
  mask: Float32Array;
  /** Normalized saliency map in [0, 1] */
  saliency: Float32Array;
  /** Connected-component labels (0 = background) */
  labels: Int32Array;
  /** Number of instance regions (excluding background) */
  instanceCount: number;
  width: number;
  height: number;
}

/**
 * Otsu threshold on a Float32Array of values in [0, 1] (or any non-negative range).
 * Returns threshold in the same units as the input.
 */
export function otsuThreshold(values: ArrayLike<number>, bins = 256): number {
  const n = values.length;
  if (n === 0) return 0;

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (!isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max) || max <= min) return min === Infinity ? 0 : min;

  const hist = new Float64Array(bins);
  const scale = (bins - 1) / (max - min);
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (!isFinite(v)) continue;
    const b = Math.max(0, Math.min(bins - 1, Math.round((v - min) * scale)));
    hist[b] += 1;
  }

  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 0;
  let bestWB = 0;
  let bestSumB = 0;
  const total = n;

  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
      bestWB = wB;
      bestSumB = sumB;
    }
  }

  // Midpoint between class means in original units (stable for >= / < binarization)
  const mB = bestWB > 0 ? bestSumB / bestWB : threshold;
  const wF = total - bestWB;
  const mF = wF > 0 ? (sum - bestSumB) / wF : threshold;
  const midBin = (mB + mF) / 2;
  return min + midBin / scale;
}

/** Lab-like lightness proxy from sRGB (0–255 channels). */
function toGray(r: number, g: number, b: number): number {
  return getBrightness(r, g, b) / 255;
}

/**
 * Frequency-tuned saliency (Achanta et al.): |I_μ − I_ω| where I_ω is
 * Gaussian-blurred Lab/gray and I_μ is mean color.
 */
export function computeFtSaliency(imageData: ImageData): Float32Array {
  const { width: w, height: h, data } = imageData;
  const n = w * h;
  const gray = new Float32Array(n);

  let mean = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const g = toGray(data[o], data[o + 1], data[o + 2]);
    gray[i] = g;
    mean += g;
  }
  mean /= n;

  // Separable Gaussian blur (approx σ≈3, radius 3)
  const kernel = [0.1065, 0.1403, 0.1658, 0.1752, 0.1658, 0.1403, 0.1065];
  const radius = 3;
  const tmp = new Float32Array(n);
  const blurred = new Float32Array(n);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        const kw = kernel[k + radius];
        acc += gray[y * w + xx] * kw;
        wsum += kw;
      }
      tmp[y * w + x] = acc / wsum;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        const kw = kernel[k + radius];
        acc += tmp[yy * w + x] * kw;
        wsum += kw;
      }
      blurred[y * w + x] = acc / wsum;
    }
  }

  const saliency = new Float32Array(n);
  let maxS = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.abs(mean - blurred[i]);
    saliency[i] = s;
    if (s > maxS) maxS = s;
  }
  if (maxS > 0) {
    for (let i = 0; i < n; i++) saliency[i] /= maxS;
  }
  return saliency;
}

function dilateBinary(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (src[yy * w + xx]) {
            on = 1;
            break;
          }
        }
      }
      dst[y * w + x] = on;
    }
  }
  return dst;
}

function erodeBinary(src: Uint8Array, w: number, h: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = 1;
      for (let dy = -1; dy <= 1 && on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || !src[yy * w + xx]) {
            on = 0;
            break;
          }
        }
      }
      dst[y * w + x] = on;
    }
  }
  return dst;
}

/**
 * 4-connected component labeling. Returns labels and count of foreground components.
 */
export function labelConnectedComponents(
  binary: Uint8Array,
  w: number,
  h: number
): { labels: Int32Array; count: number } {
  const labels = new Int32Array(w * h);
  let next = 1;
  const stack: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!binary[i] || labels[i]) continue;
      const id = next++;
      stack.length = 0;
      stack.push(i);
      labels[i] = id;
      while (stack.length) {
        const cur = stack.pop()!;
        const cx = cur % w;
        const cy = (cur / w) | 0;
        const neighbors = [
          cy > 0 ? cur - w : -1,
          cy < h - 1 ? cur + w : -1,
          cx > 0 ? cur - 1 : -1,
          cx < w - 1 ? cur + 1 : -1,
        ];
        for (const n of neighbors) {
          if (n < 0 || !binary[n] || labels[n]) continue;
          labels[n] = id;
          stack.push(n);
        }
      }
    }
  }
  return { labels, count: next - 1 };
}

/**
 * Compute instance ROI mask approximating BlendMask via FT saliency + CC.
 * @param thresholdBias - added to Otsu threshold in [0,1] saliency space (−0.2…0.2 typical)
 */
export function computeInstanceMask(
  imageData: ImageData,
  thresholdBias = 0
): InstanceMaskResult {
  const { width, height } = imageData;
  const saliency = computeFtSaliency(imageData);
  const t = Math.max(0, Math.min(1, otsuThreshold(saliency) + thresholdBias));

  let binary = new Uint8Array(width * height);
  for (let i = 0; i < binary.length; i++) {
    binary[i] = saliency[i] >= t ? 1 : 0;
  }
  // Open then close to clean noise
  binary = dilateBinary(erodeBinary(binary, width, height), width, height);
  binary = erodeBinary(dilateBinary(binary, width, height), width, height);

  const { labels, count } = labelConnectedComponents(binary, width, height);

  // Drop tiny components (< 0.1% of image)
  const minArea = Math.max(4, Math.floor(width * height * 0.001));
  const area = new Int32Array(count + 1);
  for (let i = 0; i < labels.length; i++) {
    if (labels[i]) area[labels[i]]++;
  }
  const keep = new Uint8Array(count + 1);
  let kept = 0;
  for (let id = 1; id <= count; id++) {
    if (area[id] >= minArea) {
      keep[id] = 1;
      kept++;
    }
  }

  const mask = new Float32Array(width * height);
  const remapped = new Int32Array(width * height);
  const idMap = new Int32Array(count + 1);
  let nextId = 1;
  for (let id = 1; id <= count; id++) {
    if (keep[id]) idMap[id] = nextId++;
  }
  for (let i = 0; i < labels.length; i++) {
    const lid = labels[i];
    if (lid && keep[lid]) {
      mask[i] = 1;
      remapped[i] = idMap[lid];
    }
  }

  return {
    mask,
    saliency,
    labels: remapped,
    instanceCount: kept,
    width,
    height,
  };
}

/**
 * Build ROI mask from an uploaded grayscale/alpha mask image (same size as target).
 * White / opaque → ROI.
 */
export function maskFromImageData(maskImage: ImageData): Float32Array {
  const { width, height, data } = maskImage;
  const mask = new Float32Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    const a = (data[o + 3] ?? 255) / 255;
    const g = toGray(data[o], data[o + 1], data[o + 2]);
    mask[i] = a * g > 0.5 ? 1 : 0;
  }
  return mask;
}

/**
 * Downsample a per-pixel ROI mask to per-module average in [0, 1].
 */
export function maskToModuleGrid(
  mask: Float32Array,
  imgWidth: number,
  imgHeight: number,
  qrDimension: number
): Float32Array {
  const grid = new Float32Array(qrDimension * qrDimension);
  for (let my = 0; my < qrDimension; my++) {
    for (let mx = 0; mx < qrDimension; mx++) {
      const { x, y } = mapQrCoordToImagePixel(
        mx + 0.5,
        my + 0.5,
        qrDimension,
        imgWidth,
        imgHeight
      );
      // Average 3×3 neighborhood when possible
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(imgWidth - 1, Math.max(0, x + dx));
          const yy = Math.min(imgHeight - 1, Math.max(0, y + dy));
          sum += mask[yy * imgWidth + xx];
          n++;
        }
      }
      grid[my * qrDimension + mx] = n > 0 ? sum / n : 0;
    }
  }
  return grid;
}
