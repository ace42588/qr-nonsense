import { QRMatrix } from "../shared/types";

// Re-export ImageData type for use across the codebase
// ImageData is a global DOM type, so we create a type alias
export type ImageData = globalThis.ImageData;

/**
 * Calculate an appropriate scale factor to fit an image within a QR code grid
 * The scale ensures the larger dimension of the image fits nicely within the QR dimension
 * 
 * For QR grid rasterization: effectiveSize = imageSize / scale
 * So scale > 1 zooms in (smaller effective size), scale < 1 zooms out (larger effective size)
 * 
 * @param imageWidth - Width of the source image in pixels
 * @param imageHeight - Height of the source image in pixels
 * @param qrDimension - The dimension of the QR code grid
 * @param marginFactor - Factor to leave margin (0.9 = 90% of QR dimension, leaving 10% margin)
 * @returns Scale factor (scale > 1 zooms in, scale < 1 zooms out)
 */
export function calculateAppropriateImageScale(
  imageWidth: number,
  imageHeight: number,
  qrDimension: number,
  marginFactor: number = 0.9
): number {
  // Validate inputs - check for valid numbers and non-zero values
  if (
    typeof imageWidth !== 'number' || 
    typeof imageHeight !== 'number' || 
    typeof qrDimension !== 'number' ||
    !isFinite(imageWidth) || 
    !isFinite(imageHeight) || 
    !isFinite(qrDimension) ||
    imageWidth <= 0 || 
    imageHeight <= 0 || 
    qrDimension <= 0
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
  if (maxImageDimension <= 0 || qrDimension <= 0) {
    return 1.0;
  }
  
  // Calculate scale so that the image fits within the QR dimension
  // 
  // IMPORTANT: The rasterization uses DIVISIVE scaling: scaledX = centeredX / scale + 0.5
  // This means:
  // - scale > 1: zoom IN (see less of image, smaller effective size)  
  // - scale < 1: zoom OUT (see more of image, larger effective size)
  //
  // To match halftone's multiplicative scaling visually, we need to convert the scale.
  // Halftone uses multiplicative: drawnSize = imgSize * scale (scale < 1 = smaller)
  // QRArt uses divisive: effectiveSize = imgSize / scale (scale < 1 = zoomed out)
  //
  // For visual consistency: if halftone uses scale 0.5 (half size), QRArt should show
  // the same amount of image content. Since divisive is inverse, we invert the relationship.
  // Calculate base scale as halftone would (multiplicative)
  const baseMultiplicativeScale = (qrDimension * marginFactor) / maxImageDimension;
  
  // Check for invalid base scale
  if (!isFinite(baseMultiplicativeScale) || baseMultiplicativeScale <= 0) {
    return 1.0;
  }
  
  // Convert multiplicative scale to divisive scale for visual matching
  // The conversion accounts for the inverse relationship and coordinate space differences
  // For divisive scaling to show the same image content as multiplicative scale S,
  // we use approximately 1/S, but adjusted for the coordinate transformation
  const scale = 1.0 / baseMultiplicativeScale;
  
  // Validate final scale before clamping
  if (!isFinite(scale) || scale <= 0) {
    return 1.0;
  }
  
  // Clamp scale to reasonable bounds
  return Math.max(0.1, Math.min(10.0, scale));
}

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
 * Rasterize pre-transformed image to QR grid coordinates
 * The image should already be transformed (scaled, translated) to canvas size
 * This function simply samples the ImageData at each QR module position
 * 
 * @param transformedImageData - Pre-transformed ImageData (canvas-sized, already scaled/translated)
 * @param qrDimension - The dimension of the QR code grid
 */
export function rasterizeImageToQRGrid(
  transformedImageData: ImageData,
  qrDimension: number
): Float32Array {
  // Validate inputs
  if (!qrDimension || qrDimension <= 0 || !isFinite(qrDimension)) {
    throw new Error("Invalid qrDimension");
  }

  if (!transformedImageData || !transformedImageData.width || !transformedImageData.height) {
    throw new Error("Invalid ImageData");
  }

  const imgWidth = transformedImageData.width;
  const imgHeight = transformedImageData.height;
  const data = transformedImageData.data;
  const grid = new Float32Array(qrDimension * qrDimension);

  // Sample image at each module center
  // Map QR code modules directly to canvas pixel coordinates
  for (let y = 0; y < qrDimension; y++) {
    for (let x = 0; x < qrDimension; x++) {
      // Map QR module position (0 to qrDimension-1) to canvas pixel position (0 to imgWidth-1)
      const imgX = Math.floor((x / qrDimension) * imgWidth);
      const imgY = Math.floor((y / qrDimension) * imgHeight);

      // Clamp to valid image bounds
      const clampedX = Math.max(0, Math.min(imgWidth - 1, imgX));
      const clampedY = Math.max(0, Math.min(imgHeight - 1, imgY));

      const idx = (clampedY * imgWidth + clampedX) * 4;
      const r = data[idx] || 0;
      const g = data[idx + 1] || 0;
      const b = data[idx + 2] || 0;

      // Convert to brightness (0 = black/dark, 1 = white/light)
      // For QArt, we want dark image areas to become dark QR modules
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      grid[y * qrDimension + x] = brightness;
    }
  }

  return grid;
}

/**
 * Compute visual error between QR matrix and target image
 * Only considers controllable modules (data + EC, not reserved patterns)
 */
export function computeVisualError(
  matrix: QRMatrix,
  targetGrid: Float32Array,
  qrDimension: number
): number {
  let totalError = 0;
  let count = 0;

  for (let y = 0; y < qrDimension; y++) {
    for (let x = 0; x < qrDimension; x++) {
      const module = matrix[y]?.[x];
      if (!module || module.nonData) continue; // Skip reserved modules

      const targetBrightness = targetGrid[y * qrDimension + x];
      const actualBrightness = module.isDark ? 0 : 1;
      const error = Math.abs(targetBrightness - actualBrightness);

      totalError += error;
      count++;
    }
  }

  return count > 0 ? totalError / count : Infinity;
}

// Calculate perceived brightness from RGB values
export function getBrightness(r: number, g: number, b: number): number {
  // Perceived brightness, 0=black, 255=white
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Calculate local variance (contrast) for a pixel position
 * Matches Go implementation: calculates variance in an 11x11 neighborhood (radius=5)
 * 
 * IMPORTANT: Uses 0-255 scale values (not normalized 0-1) to match Go implementation's integer arithmetic
 * 
 * @param targetGrid - Rasterized brightness grid (0-1 normalized, will be scaled to 0-255)
 * @param dimension - QR code dimension
 * @param x - Module x position
 * @param y - Module y position
 * @param radius - Neighborhood radius (default 5 for 11x11 window)
 * @returns Variance value on 0-255 scale (higher = more contrast, matches Go integer values)
 */
export function calculateLocalVariance(
  targetGrid: Float32Array,
  dimension: number,
  x: number,
  y: number,
  radius: number = 5
): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < dimension && ny >= 0 && ny < dimension) {
        // Scale from 0-1 to 0-255 to match Go implementation's integer arithmetic
        const val = targetGrid[ny * dimension + nx] * 255;
        sum += val;
        sumSq += val * val;
        n++;
      }
    }
  }
  
  if (n === 0) return 0;
  const avg = sum / n;
  // Variance formula: E[X^2] - (E[X])^2
  // Returns variance on 0-255 scale (matches Go implementation)
  return (sumSq / n) - (avg * avg);
}

// Compute importance map using edge detection (Sobel)
export function computeImportanceMap(imgData: ImageData, size: number, alpha: number = 0.5): Float32Array {
  const data = imgData.data;
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
 * Calculate image complexity score from ImageData using computeImportanceMap variance
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
  
  // Compute importance map
  const importanceMap = computeImportanceMap(imageData, qrDimension, 0.5);
  
  // Calculate variance of importance map values
  const n = importanceMap.length;
  if (n === 0) return 0;
  
  // Calculate mean
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += importanceMap[i];
  }
  const mean = sum / n;
  
  // Calculate variance
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = importanceMap[i] - mean;
    variance += diff * diff;
  }
  variance = variance / n;
  
  // Normalize variance to 0-1 range (variance of values in [0,1] range is at most 0.25)
  // Use sqrt to get standard deviation and normalize
  const stdDev = Math.sqrt(variance);
  // Normalize: stdDev of [0,1] values is at most 0.5, so divide by 0.5 to get 0-1
  const complexity = Math.min(1.0, stdDev / 0.5);
  
  return complexity;
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
