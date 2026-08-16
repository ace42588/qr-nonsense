/**
 * Haar discrete wavelet transform (2D) for HVS-aware IS-QR post-processing.
 */

export interface HaarSubbands {
  ll: Float32Array;
  lh: Float32Array;
  hl: Float32Array;
  hh: Float32Array;
  halfW: number;
  halfH: number;
}

function evenSize(n: number): number {
  return n - (n % 2);
}

/**
 * One-level 2D Haar forward transform.
 * Processes the top-left even×even region of src (row-major, stride = width).
 */
export function haarForward2D(
  src: Float32Array,
  width: number,
  height: number
): HaarSubbands {
  const w = evenSize(width);
  const h = evenSize(height);
  const halfW = w / 2;
  const halfH = h / 2;

  const ll = new Float32Array(halfW * halfH);
  const lh = new Float32Array(halfW * halfH);
  const hl = new Float32Array(halfW * halfH);
  const hh = new Float32Array(halfW * halfH);

  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const a = src[(2 * y) * width + 2 * x];
      const b = src[(2 * y) * width + 2 * x + 1];
      const c = src[(2 * y + 1) * width + 2 * x];
      const d = src[(2 * y + 1) * width + 2 * x + 1];
      const i = y * halfW + x;
      ll[i] = (a + b + c + d) / 4;
      lh[i] = (a - b + c - d) / 4;
      hl[i] = (a + b - c - d) / 4;
      hh[i] = (a - b - c + d) / 4;
    }
  }

  return { ll, lh, hl, hh, halfW, halfH };
}

/**
 * One-level 2D Haar inverse. Writes into a buffer of size outWidth×outHeight.
 * Odd trailing rows/cols (if any) are left as 0.
 */
export function haarInverse2D(
  bands: HaarSubbands,
  outWidth: number,
  outHeight: number
): Float32Array {
  const { ll, lh, hl, hh, halfW, halfH } = bands;
  const out = new Float32Array(outWidth * outHeight);

  for (let y = 0; y < halfH; y++) {
    for (let x = 0; x < halfW; x++) {
      const i = y * halfW + x;
      const llv = ll[i];
      const lhv = lh[i];
      const hlv = hl[i];
      const hhv = hh[i];
      const a = llv + lhv + hlv + hhv;
      const b = llv - lhv + hlv - hhv;
      const c = llv + lhv - hlv - hhv;
      const d = llv - lhv - hlv + hhv;
      const y0 = 2 * y;
      const y1 = 2 * y + 1;
      const x0 = 2 * x;
      const x1 = 2 * x + 1;
      if (y0 < outHeight && x0 < outWidth) out[y0 * outWidth + x0] = a;
      if (y0 < outHeight && x1 < outWidth) out[y0 * outWidth + x1] = b;
      if (y1 < outHeight && x0 < outWidth) out[y1 * outWidth + x0] = c;
      if (y1 < outHeight && x1 < outWidth) out[y1 * outWidth + x1] = d;
    }
  }

  // Copy odd edge from nearest if dimensions are odd
  if (outWidth % 2 === 1) {
    for (let y = 0; y < outHeight; y++) {
      out[y * outWidth + outWidth - 1] = out[y * outWidth + outWidth - 2] ?? 0;
    }
  }
  if (outHeight % 2 === 1) {
    for (let x = 0; x < outWidth; x++) {
      out[(outHeight - 1) * outWidth + x] =
        out[(outHeight - 2) * outWidth + x] ?? 0;
    }
  }

  return out;
}

/** Extract Y (luminance 0–255) from ImageData. */
export function extractLuma(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const y = new Float32Array(width * height);
  for (let i = 0; i < y.length; i++) {
    const o = i * 4;
    y[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  }
  return y;
}

/** Apply luma buffer back onto ImageData via luminance scaling. */
export function applyLumaToImageData(
  imageData: ImageData,
  luma: Float32Array
): ImageData {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;
  for (let i = 0; i < luma.length; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const oldY = 0.299 * r + 0.587 * g + 0.114 * b;
    const newY = Math.max(0, Math.min(255, luma[i]));
    if (oldY < 1e-3) {
      dst[o] = newY;
      dst[o + 1] = newY;
      dst[o + 2] = newY;
    } else {
      const s = newY / oldY;
      dst[o] = Math.max(0, Math.min(255, r * s));
      dst[o + 1] = Math.max(0, Math.min(255, g * s));
      dst[o + 2] = Math.max(0, Math.min(255, b * s));
    }
    dst[o + 3] = data[o + 3] ?? 255;
  }
  return out;
}
