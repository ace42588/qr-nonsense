/**
 * Browser-based image loading and transformation adapter
 * Uses browser APIs (HTMLImageElement, canvas) for image operations
 */

/**
 * Load and process an image from a URL
 * @param imageUrl - URL of the image to load
 * @returns Promise resolving to HTMLImageElement
 */
export async function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * Transform an image to canvas size with scale and translation
 * @param image - Source image (HTMLImageElement, ImageData, or image URL string)
 * @param canvasSize - Target canvas size (square)
 * @param scale - Scale factor (1.0 = original size relative to canvas)
 * @param offsetX - Horizontal offset in pixels (0 = centered)
 * @param offsetY - Vertical offset in pixels (0 = centered)
 * @returns Transformed ImageData sized to canvasSize x canvasSize
 */
export async function transformImageToCanvas(
  image: HTMLImageElement | ImageData | string,
  canvasSize: number,
  scale: number = 1.0,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<ImageData> {
  // Validate inputs
  if (!canvasSize || canvasSize <= 0 || !isFinite(canvasSize)) {
    throw new Error("Invalid canvasSize");
  }

  if (!isFinite(scale) || scale <= 0) {
    scale = 1.0;
  }

  if (!isFinite(offsetX)) offsetX = 0;
  if (!isFinite(offsetY)) offsetY = 0;

  // Load image if needed
  let sourceImage: HTMLImageElement | ImageData;
  
  if (typeof image === "string") {
    sourceImage = await loadImage(image);
  } else {
    sourceImage = image;
  }

  // Create canvas for transformation
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill with white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Draw image with transformation
  if (sourceImage instanceof HTMLImageElement) {
    const drawWidth = sourceImage.width * scale;
    const drawHeight = sourceImage.height * scale;
    
    // Center the image, then apply offset
    const drawX = canvasSize / 2 - drawWidth / 2 + offsetX;
    const drawY = canvasSize / 2 - drawHeight / 2 + offsetY;
    
    ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
  } else {
    // For ImageData, we need to draw it to a temporary canvas first
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sourceImage.width;
    tempCanvas.height = sourceImage.height;
    const tempCtx = tempCanvas.getContext("2d");
    
    if (!tempCtx) {
      throw new Error("Failed to get temporary canvas context");
    }
    
    tempCtx.putImageData(sourceImage, 0, 0);
    
    const drawWidth = sourceImage.width * scale;
    const drawHeight = sourceImage.height * scale;
    
    // Center the image, then apply offset
    const drawX = canvasSize / 2 - drawWidth / 2 + offsetX;
    const drawY = canvasSize / 2 - drawHeight / 2 + offsetY;
    
    ctx.drawImage(tempCanvas, drawX, drawY, drawWidth, drawHeight);
  }

  // Return the transformed ImageData
  return ctx.getImageData(0, 0, canvasSize, canvasSize);
}

/**
 * Downscale a data-URL image when either dimension exceeds maxDimension (FR-025).
 * Returns the original URL when already within bounds.
 */
export async function downscaleImageDataUrl(
  dataUrl: string,
  maxDimension: number = 4096
): Promise<string> {
  const img = await loadImage(dataUrl);
  const maxDim = Math.max(img.width, img.height);
  if (!isFinite(maxDim) || maxDim <= 0) {
    throw new Error("Image has invalid dimensions");
  }
  if (maxDim <= maxDimension) {
    return dataUrl;
  }

  const scale = maxDimension / maxDim;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to scale image: canvas context unavailable");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

