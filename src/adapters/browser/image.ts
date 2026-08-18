/**
 * Browser-based image loading and transformation adapter
 * Uses browser APIs (HTMLImageElement, canvas, OffscreenCanvas) for image operations
 */

import {
  create2dCanvas,
  isHtmlImage,
  isImageBitmap,
  type DrawableImage,
} from "./canvasPort";

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
export async function transformDrawableToCanvas(
  sourceImage: DrawableImage,
  canvasSize: number,
  scale: number = 1.0,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<ImageData> {
  if (!canvasSize || canvasSize <= 0 || !isFinite(canvasSize)) {
    throw new Error("Invalid canvasSize");
  }

  if (!isFinite(scale) || scale <= 0) {
    scale = 1.0;
  }

  if (!isFinite(offsetX)) offsetX = 0;
  if (!isFinite(offsetY)) offsetY = 0;

  const { canvas, ctx } = create2dCanvas(canvasSize, canvasSize);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const drawFromBitmapOrElement = (
    width: number,
    height: number,
    draw: (dx: number, dy: number, dw: number, dh: number) => void
  ) => {
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const drawX = canvasSize / 2 - drawWidth / 2 + offsetX;
    const drawY = canvasSize / 2 - drawHeight / 2 + offsetY;
    draw(drawX, drawY, drawWidth, drawHeight);
  };

  if (isHtmlImage(sourceImage) || isImageBitmap(sourceImage)) {
    drawFromBitmapOrElement(
      sourceImage.width,
      sourceImage.height,
      (dx, dy, dw, dh) => {
        ctx.drawImage(sourceImage, dx, dy, dw, dh);
      }
    );
  } else if (
    sourceImage instanceof OffscreenCanvas ||
    (typeof HTMLCanvasElement !== "undefined" &&
      sourceImage instanceof HTMLCanvasElement)
  ) {
    drawFromBitmapOrElement(
      sourceImage.width,
      sourceImage.height,
      (dx, dy, dw, dh) => {
        ctx.drawImage(sourceImage as CanvasImageSource, dx, dy, dw, dh);
      }
    );
  } else {
    const imageData = sourceImage as ImageData;
    const temp = create2dCanvas(imageData.width, imageData.height);
    temp.ctx.putImageData(imageData, 0, 0);
    drawFromBitmapOrElement(
      imageData.width,
      imageData.height,
      (dx, dy, dw, dh) => {
        ctx.drawImage(temp.canvas as CanvasImageSource, dx, dy, dw, dh);
      }
    );
  }

  void canvas;
  return ctx.getImageData(0, 0, canvasSize, canvasSize);
}

export async function transformImageToCanvas(
  image: HTMLImageElement | ImageBitmap | ImageData | string,
  canvasSize: number,
  scale: number = 1.0,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<ImageData> {
  let sourceImage: DrawableImage;
  if (typeof image === "string") {
    sourceImage = await loadImage(image);
  } else {
    sourceImage = image;
  }
  return transformDrawableToCanvas(
    sourceImage,
    canvasSize,
    scale,
    offsetX,
    offsetY
  );
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

