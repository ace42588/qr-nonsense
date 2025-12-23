/**
 * Transform an image by applying scale and translation, producing a canvas-sized ImageData
 * This centralizes all image transformation logic so components don't need to reimplement it
 */

import { loadImage } from "@/domain/image";

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

