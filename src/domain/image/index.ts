import {
  getBrightness,
  mapQrCoordToImagePixel,
  rasterizeImageToQRGrid,
} from "./sampling";
import type { ImageData } from "./sampling";

export type { ImageData, SampleMode, ModuleSample, SampleQrModuleOptions } from "./sampling";
export {
  getBrightness,
  mapQrCoordToImagePixel,
  readImagePixel,
  sampleQrModule,
  rasterizeImageToQRGrid,
} from "./sampling";
export { advanceAnimationClock } from "./animationClock";

/**
 * Calculate an appropriate scale factor for canvas-based image drawing (multiplicative scaling)
 * The scale ensures the larger dimension of the image fits nicely within the canvas size
 * 
 * For canvas drawing: drawnSize = imageSize * scale
 * So scale < 1 makes image smaller (fits better), scale > 1 makes image larger
 * 
 * @param imageWidth - Width of the source image in pixels
 * @param imageHeight - Height of the source image in pixels
 * @param canvasSize - The size of the canvas in pixels
 * @param marginFactor - Factor to leave margin (0.9 = 90% of canvas size, leaving 10% margin)
 * @returns Scale factor (scale < 1 makes image smaller, scale > 1 makes image larger)
 */
export function calculateAppropriateCanvasScale(
  imageWidth: number,
  imageHeight: number,
  canvasSize: number,
  marginFactor: number = 0.9
): number {
  // Validate inputs - check for valid numbers and non-zero values
  if (
    typeof imageWidth !== 'number' || 
    typeof imageHeight !== 'number' || 
    typeof canvasSize !== 'number' ||
    !isFinite(imageWidth) || 
    !isFinite(imageHeight) || 
    !isFinite(canvasSize) ||
    imageWidth <= 0 || 
    imageHeight <= 0 || 
    canvasSize <= 0
  ) {
    return 1.0;
  }
  
  // Validate marginFactor
  if (typeof marginFactor !== 'number' || !isFinite(marginFactor) || marginFactor <= 0 || marginFactor > 1) {
    marginFactor = 0.9;
  }
  
  // Use the larger dimension of the image to determine scale
  const maxImageDimension = Math.max(imageWidth, imageHeight);
  
  // Prevent division by zero
  if (maxImageDimension <= 0 || canvasSize <= 0) {
    return 1.0;
  }
  
  // Calculate scale so that drawnSize fits within canvasSize * marginFactor
  // drawnSize = maxImageDimension * scale, and we want drawnSize = canvasSize * marginFactor
  // So: canvasSize * marginFactor = maxImageDimension * scale
  // Therefore: scale = (canvasSize * marginFactor) / maxImageDimension
  const scale = (canvasSize * marginFactor) / maxImageDimension;
  
  // Validate scale before clamping
  if (!isFinite(scale) || scale <= 0) {
    return 1.0;
  }
  
  // Clamp scale to reasonable bounds
  return Math.max(0.1, Math.min(3.0, scale));
}


/**
 * Compute contrast grid (local variance) for all module positions efficiently
 * Uses optimized approach to avoid recalculating overlapping neighborhoods
 * 
 * @param targetGrid - Pre-rasterized image grid (0-1 brightness values)
 * @param dimension - QR code dimension
 * @param radius - Neighborhood radius (default 5 for 11x11 window)
 * @returns Contrast grid as Float32Array with variance values on 0-255 scale
 */
export function computeContrastGrid(
  targetGrid: Float32Array,
  dimension: number,
  radius: number = 5
): Float32Array {
  const contrastGrid = new Float32Array(dimension * dimension);
  
  // Pre-scale values to 0-255 once to avoid repeated multiplication
  const scaledGrid = new Float32Array(dimension * dimension);
  for (let i = 0; i < dimension * dimension; i++) {
    scaledGrid[i] = targetGrid[i] * 255;
  }
  
  // Compute variance for each position
  // Optimization: Pre-scale values once, use direct array access, and calculate bounds once per position
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      let sum = 0;
      let sumSq = 0;
      let n = 0;
      
      // Calculate bounds once per position
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(dimension - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(dimension - 1, x + radius);
      
      // Iterate only over valid region
      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const val = scaledGrid[ny * dimension + nx];
          sum += val;
          sumSq += val * val;
          n++;
        }
      }
      
      if (n === 0) {
        contrastGrid[y * dimension + x] = 0;
      } else {
        const avg = sum / n;
        // Variance formula: E[X^2] - (E[X])^2
        contrastGrid[y * dimension + x] = (sumSq / n) - (avg * avg);
      }
    }
  }
  
  return contrastGrid;
}

// Compute importance map using edge detection (Sobel)
// CRITICAL: size parameter must match imgData.width and imgData.height (image must be square)
export function computeImportanceMap(imgData: ImageData, size: number, alpha: number = 0.5): Float32Array {
  const data = imgData.data;
  const imgWidth = imgData.width;
  const imgHeight = imgData.height;
  
  // Validate that size matches image dimensions
  if (imgWidth !== size || imgHeight !== size) {
    console.warn(`computeImportanceMap: size parameter (${size}) does not match image dimensions (${imgWidth}x${imgHeight}). Using image dimensions.`);
    // Use actual image dimensions
    const actualSize = imgWidth;
    const importance = new Float32Array(actualSize * actualSize);
    const brightnessArr = new Float32Array(actualSize * actualSize);

    // Compute brightness for each pixel using actual image width
    for (let y = 0; y < actualSize; ++y) {
      for (let x = 0; x < actualSize; ++x) {
        const i = (y * imgWidth + x) * 4;
        brightnessArr[y * actualSize + x] = getBrightness(data[i], data[i + 1], data[i + 2]) / 255;
      }
    }

    // Compute edge strength (Sobel) using actual image width
    for (let y = 1; y < actualSize - 1; ++y) {
      for (let x = 1; x < actualSize - 1; ++x) {
        const i = (y * imgWidth + x) * 4;
        const gx =
          getBrightness(data[i + 4], data[i + 5], data[i + 6]) -
          getBrightness(data[i - 4], data[i - 3], data[i - 2]);
        const gy =
          getBrightness(
            data[i + imgWidth * 4],
            data[i + imgWidth * 4 + 1],
            data[i + imgWidth * 4 + 2]
          ) -
          getBrightness(
            data[i - imgWidth * 4],
            data[i - imgWidth * 4 + 1],
            data[i - imgWidth * 4 + 2]
          );
        const edge = Math.sqrt(gx * gx + gy * gy) / 255;
        const brightness = brightnessArr[y * actualSize + x];
        // Combine edge and brightness (midtones are more important)
        importance[y * actualSize + x] = alpha * edge + (1 - alpha) * (1 - Math.abs(brightness - 0.5) * 2);
      }
    }
    
    // Normalize importance map to 0-1
    let maxImp = 0;
    for (let i = 0; i < importance.length; ++i) {
      if (importance[i] > maxImp) {
        maxImp = importance[i];
      }
    }
    if (maxImp > 0) {
      for (let i = 0; i < importance.length; ++i) importance[i] /= maxImp;
    }
    
    return importance;
  }
  
  // Original code path when size matches image dimensions
  const importance = new Float32Array(size * size);
  const brightnessArr = new Float32Array(size * size);

  // Compute brightness for each pixel
  for (let y = 0; y < size; ++y) {
    for (let x = 0; x < size; ++x) {
      const i = (y * size + x) * 4;
      brightnessArr[y * size + x] = getBrightness(data[i], data[i + 1], data[i + 2]) / 255;
    }
  }

  // Compute edge strength (Sobel)
  for (let y = 1; y < size - 1; ++y) {
    for (let x = 1; x < size - 1; ++x) {
      const i = (y * size + x) * 4;
      const gx =
        getBrightness(data[i + 4], data[i + 5], data[i + 6]) -
        getBrightness(data[i - 4], data[i - 3], data[i - 2]);
      const gy =
        getBrightness(
          data[i + size * 4],
          data[i + size * 4 + 1],
          data[i + size * 4 + 2]
        ) -
        getBrightness(
          data[i - size * 4],
          data[i - size * 4 + 1],
          data[i - size * 4 + 2]
        );
      const edge = Math.sqrt(gx * gx + gy * gy) / 255;
      const brightness = brightnessArr[y * size + x];
      // Combine edge and brightness (midtones are more important)
      importance[y * size + x] = alpha * edge + (1 - alpha) * (1 - Math.abs(brightness - 0.5) * 2);
    }
  }

  // Normalize importance map to 0-1
  // Use a loop instead of spread operator to avoid stack overflow with large arrays
  let maxImp = 0;
  for (let i = 0; i < importance.length; ++i) {
    if (importance[i] > maxImp) {
      maxImp = importance[i];
    }
  }
  if (maxImp > 0) {
    for (let i = 0; i < importance.length; ++i) importance[i] /= maxImp;
  }

  return importance;
}

/**
 * Nearest-neighbor resize to a square. Preserves high-frequency structure
 * (e.g. checkerboards) that box-filter downsampling would average away.
 */
export function resizeImageDataNearest(imageData: ImageData, size: number): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const src = imageData.data;
  const result = new ImageData(size, size);
  const dst = result.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { x: srcX, y: srcY } = mapQrCoordToImagePixel(
        x + 0.5,
        y + 0.5,
        size,
        srcW,
        srcH
      );
      const si = (srcY * srcW + srcX) * 4;
      const di = (y * size + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3] ?? 255;
    }
  }

  return result;
}

/**
 * Calculate image complexity score from ImageData using brightness variance
 * at QR module resolution.
 *
 * Importance-map variance is inverted for this purpose: computeImportanceMap
 * boosts midtones, so a flat gray field scores high, while a 1px checkerboard
 * has canceling Sobel neighbors and scores low. Rasterize to qrDimension first
 * so the metric matches what QArt actually sees.
 *
 * @param imageData - Target image data
 * @param qrDimension - QR code dimension
 * @returns Complexity score (0-1, higher = more complex)
 */
export function calculateImageComplexity(
  imageData: ImageData,
  qrDimension: number
): number {
  // Validate inputs
  if (!imageData || !imageData.width || !imageData.height) {
    return 0;
  }
  
  if (!qrDimension || qrDimension <= 0 || !isFinite(qrDimension)) {
    return 0;
  }

  let grid: Float32Array;
  try {
    grid = rasterizeImageToQRGrid(imageData, qrDimension);
  } catch {
    return 0;
  }
  const n = grid.length;
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += grid[i];
  }
  const mean = sum / n;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = grid[i] - mean;
    variance += diff * diff;
  }
  variance = variance / n;

  // Stddev of values in [0,1] is at most 0.5
  const stdDev = Math.sqrt(variance);
  return Math.min(1.0, stdDev / 0.5);
}

/**
 * Convert transparent areas in images with alpha channels to white background
 * 
 * @param imageData - ImageData with potential alpha channel
 * @returns ImageData with transparent areas converted to white
 */
export function convertTransparencyToWhite(imageData: ImageData): ImageData {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    throw new Error("Invalid ImageData");
  }
  
  // Create a new ImageData with same dimensions
  const result = new ImageData(imageData.width, imageData.height);
  const srcData = imageData.data;
  const dstData = result.data;
  
  // Check if source has alpha channel (data length suggests it)
  const hasAlpha = srcData.length === imageData.width * imageData.height * 4;
  
  for (let i = 0; i < srcData.length; i += 4) {
    const r = srcData[i];
    const g = srcData[i + 1];
    const b = srcData[i + 2];
    const a = hasAlpha ? srcData[i + 3] : 255;
    
    if (a < 255) {
      // Transparent or semi-transparent pixel - convert to white
      // Use alpha compositing: result = foreground * alpha + background * (1 - alpha)
      // Background is white (255, 255, 255)
      const alpha = a / 255;
      dstData[i] = Math.round(r * alpha + 255 * (1 - alpha));
      dstData[i + 1] = Math.round(g * alpha + 255 * (1 - alpha));
      dstData[i + 2] = Math.round(b * alpha + 255 * (1 - alpha));
      dstData[i + 3] = 255; // Fully opaque
    } else {
      // Fully opaque pixel - copy as-is
      dstData[i] = r;
      dstData[i + 1] = g;
      dstData[i + 2] = b;
      dstData[i + 3] = 255;
    }
  }
  
  return result;
}

/**
 * Detect if image requires extreme scaling (potential quality issues)
 * 
 * @param scaleFactor - Calculated scale factor
 * @returns Object with isExtreme flag and warning message
 */
export function detectExtremeScaling(scaleFactor: number): {
  isExtreme: boolean;
  warning: string | null;
} {
  if (!isFinite(scaleFactor) || scaleFactor <= 0) {
    return {
      isExtreme: false,
      warning: null,
    };
  }
  
  const isExtreme = scaleFactor > 10.0 || scaleFactor < 0.1;
  
  if (isExtreme) {
    const direction = scaleFactor > 10.0 ? "up" : "down";
    const factor = scaleFactor > 10.0 ? scaleFactor.toFixed(1) : (1 / scaleFactor).toFixed(1);
    return {
      isExtreme: true,
      warning: `Image requires extreme scaling (${factor}x ${direction}), which may result in quality issues.`,
    };
  }
  
  return {
    isExtreme: false,
    warning: null,
  };
}

export {
  DEFAULT_GIF_FRAME_DELAY_MS,
  isGifBuffer,
  normalizeGifDelayMs,
  createImageData,
  cloneImageData,
  scaleImageDataToMaxDimension,
  compositeGifFrames,
} from "./gif";
export type { GifPatchFrame, CompositedGif } from "./gif";
export {
  isWebPBuffer,
  parseWebPAnimation,
  wrapWebPFramePayload,
} from "./webp";
export type { ParsedWebPAnimation, WebPAnimFrame } from "./webp";

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB (FR-024)
export const MAX_IMAGE_DIMENSION = 4096; // FR-025
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

export interface ImageFileLike {
  size: number;
  type: string;
  name?: string;
}

/**
 * Validate an uploaded image file (size, MIME type / extension).
 * Returns an error message, or null if the file is acceptable.
 */
export function validateImageFile(file: ImageFileLike): string | null {
  if (!file) {
    return "No image file selected.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Image file is empty.";
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return "Image file exceeds the 10MB limit.";
  }

  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const extOk = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
  const mimeOk = mime !== "" && ALLOWED_IMAGE_MIME_TYPES.includes(mime);

  if (mime) {
    if (!mimeOk) {
      return "Unsupported image type. Use JPEG, PNG, GIF, or WebP.";
    }
  } else if (name && !extOk) {
    return "Unsupported image type. Use JPEG, PNG, GIF, or WebP.";
  } else if (!mime && !name) {
    return "Unsupported image type. Use JPEG, PNG, GIF, or WebP.";
  }

  return null;
}
