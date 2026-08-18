import type { ImageData } from "./sampling";

export const DEFAULT_GIF_FRAME_DELAY_MS = 100;

export interface GifPatchFrame {
  dims: { width: number; height: number; top: number; left: number };
  delay: number;
  disposalType: number;
  patch: Uint8ClampedArray;
  /** When true, copy every pixel in the patch (WebP blend=source). */
  overwrite?: boolean;
}

export interface CompositedGif {
  frames: ImageData[];
  delaysMs: number[];
}

export function isGifBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 6) return false;
  const sig = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4],
    bytes[5]
  );
  return sig === "GIF87a" || sig === "GIF89a";
}

export function normalizeGifDelayMs(delayMs: number): number {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return DEFAULT_GIF_FRAME_DELAY_MS;
  }
  return delayMs;
}

export function createImageData(
  width: number,
  height: number,
  pixels?: Uint8ClampedArray
): ImageData {
  const image = new ImageData(width, height);
  if (pixels) {
    image.data.set(pixels);
  }
  return image;
}

export function cloneImageData(imageData: ImageData): ImageData {
  return createImageData(
    imageData.width,
    imageData.height,
    new Uint8ClampedArray(imageData.data)
  );
}

/**
 * Scale ImageData so max(width, height) <= maxDimension, preserving aspect ratio.
 */
export function scaleImageDataToMaxDimension(
  imageData: ImageData,
  maxDimension: number
): ImageData {
  const maxDim = Math.max(imageData.width, imageData.height);
  if (!Number.isFinite(maxDim) || maxDim <= 0 || maxDim <= maxDimension) {
    return imageData;
  }
  const scale = maxDimension / maxDim;
  const width = Math.max(1, Math.round(imageData.width * scale));
  const height = Math.max(1, Math.round(imageData.height * scale));
  const result = createImageData(width, height);
  const src = imageData.data;
  const dst = result.data;
  for (let y = 0; y < height; y++) {
    const srcY = Math.min(
      imageData.height - 1,
      Math.floor((y + 0.5) * (imageData.height / height))
    );
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(
        imageData.width - 1,
        Math.floor((x + 0.5) * (imageData.width / width))
      );
      const si = (srcY * imageData.width + srcX) * 4;
      const di = (y * width + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3] ?? 255;
    }
  }
  return result;
}

function blitPatch(
  canvas: Uint8ClampedArray,
  canvasWidth: number,
  frame: GifPatchFrame
): void {
  const { left, top, width, height } = frame.dims;
  const patch = frame.patch;
  const overwrite = frame.overwrite === true;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const a = patch[pi + 3] ?? 255;
      if (!overwrite && a === 0) continue;
      const cx = left + x;
      const cy = top + y;
      if (cx < 0 || cy < 0 || cx >= canvasWidth) continue;
      const ci = (cy * canvasWidth + cx) * 4;
      if (overwrite) {
        canvas[ci] = patch[pi];
        canvas[ci + 1] = patch[pi + 1];
        canvas[ci + 2] = patch[pi + 2];
        canvas[ci + 3] = a;
        continue;
      }
      if (a === 255) {
        canvas[ci] = patch[pi];
        canvas[ci + 1] = patch[pi + 1];
        canvas[ci + 2] = patch[pi + 2];
        canvas[ci + 3] = 255;
      } else {
        const alpha = a / 255;
        canvas[ci] = Math.round(patch[pi] * alpha + canvas[ci] * (1 - alpha));
        canvas[ci + 1] = Math.round(
          patch[pi + 1] * alpha + canvas[ci + 1] * (1 - alpha)
        );
        canvas[ci + 2] = Math.round(
          patch[pi + 2] * alpha + canvas[ci + 2] * (1 - alpha)
        );
        canvas[ci + 3] = 255;
      }
    }
  }
}

function fillRect(
  canvas: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  dims: GifPatchFrame["dims"],
  color: { r: number; g: number; b: number }
): void {
  const x0 = Math.max(0, dims.left);
  const y0 = Math.max(0, dims.top);
  const x1 = Math.min(canvasWidth, dims.left + dims.width);
  const y1 = Math.min(canvasHeight, dims.top + dims.height);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * canvasWidth + x) * 4;
      canvas[i] = color.r;
      canvas[i + 1] = color.g;
      canvas[i + 2] = color.b;
      canvas[i + 3] = 255;
    }
  }
}

/**
 * Composite GIF patches into full-canvas frames, honoring disposal 0–3.
 */
export function compositeGifFrames(
  width: number,
  height: number,
  frames: GifPatchFrame[],
  background: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }
): CompositedGif {
  const pixelCount = width * height * 4;
  let canvas = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i += 4) {
    canvas[i] = background.r;
    canvas[i + 1] = background.g;
    canvas[i + 2] = background.b;
    canvas[i + 3] = 255;
  }
  let previous = new Uint8ClampedArray(canvas);

  const outFrames: ImageData[] = [];
  const delaysMs: number[] = [];

  for (const frame of frames) {
    if (frame.disposalType === 3) {
      previous = new Uint8ClampedArray(canvas);
    }

    blitPatch(canvas, width, frame);
    outFrames.push(createImageData(width, height, new Uint8ClampedArray(canvas)));
    delaysMs.push(normalizeGifDelayMs(frame.delay));

    if (frame.disposalType === 2) {
      fillRect(canvas, width, height, frame.dims, background);
    } else if (frame.disposalType === 3) {
      canvas = new Uint8ClampedArray(previous);
    }
  }

  return { frames: outFrames, delaysMs };
}
