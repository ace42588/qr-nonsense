/**
 * Shared QR-module ↔ image-pixel pipeline used by QArt rasterization and
 * Halftone rendering. Both paths must go through mapQrCoordToImagePixel so
 * sample points cannot drift (T17).
 *
 * QR space is in module units. Integer (mx, my) is the module's top-left.
 * The module center is (mx + 0.5, my + 0.5). Area sampling uses sub-pixel
 * centers: (mx + (s + 0.5) / modulePixel).
 */

export type ImageData = globalThis.ImageData;
export type SampleMode = "center" | "area";

export interface ModuleSample {
  brightness: number;
  importance: number;
}

export interface SampleQrModuleOptions {
  mode?: SampleMode;
  modulePixel?: number;
  importanceMap?: ArrayLike<number> | null;
}

/**
 * Perceived brightness on a 0–255 scale.
 */
export function getBrightness(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Map a (possibly fractional) QR-space coordinate onto a clamped image pixel.
 * Callers pass module-center or sub-pixel-center coordinates; this function
 * does not add 0.5 itself.
 */
export function mapQrCoordToImagePixel(
  qrX: number,
  qrY: number,
  qrDimension: number,
  imgWidth: number,
  imgHeight: number
): { x: number; y: number } {
  const x = Math.max(
    0,
    Math.min(imgWidth - 1, Math.floor((qrX / qrDimension) * imgWidth))
  );
  const y = Math.max(
    0,
    Math.min(imgHeight - 1, Math.floor((qrY / qrDimension) * imgHeight))
  );
  return { x, y };
}

export function readImagePixel(
  imageData: ImageData,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number; brightness: number; index: number } {
  const idx = (y * imageData.width + x) * 4;
  const data = imageData.data;
  const r = data[idx] || 0;
  const g = data[idx + 1] || 0;
  const b = data[idx + 2] || 0;
  const a = data[idx + 3] ?? 255;
  return {
    r,
    g,
    b,
    a,
    brightness: getBrightness(r, g, b) / 255,
    index: idx,
  };
}

function importanceAt(
  importanceMap: ArrayLike<number> | null | undefined,
  imgWidth: number,
  x: number,
  y: number
): number {
  if (!importanceMap) return 0;
  return importanceMap[y * imgWidth + x] || 0;
}

/**
 * Sample one QR module from a transformed image.
 *
 * - `center` (default): one pixel at the module center. Same sample
 *   rasterizeImageToQRGrid uses for that module.
 * - `area`: average of modulePixel² sub-pixel centers covering the module.
 */
export function sampleQrModule(
  imageData: ImageData,
  qrDimension: number,
  qrModuleX: number,
  qrModuleY: number,
  options: SampleQrModuleOptions = {}
): ModuleSample {
  const mode = options.mode ?? "center";
  const imgWidth = imageData.width;
  const imgHeight = imageData.height;
  const { importanceMap } = options;

  if (mode === "area") {
    const modulePixel = options.modulePixel ?? 3;
    let totalBrightness = 0;
    let totalImportance = 0;
    let n = 0;

    for (let sy = 0; sy < modulePixel; sy++) {
      for (let sx = 0; sx < modulePixel; sx++) {
        const { x, y } = mapQrCoordToImagePixel(
          qrModuleX + (sx + 0.5) / modulePixel,
          qrModuleY + (sy + 0.5) / modulePixel,
          qrDimension,
          imgWidth,
          imgHeight
        );
        totalBrightness += readImagePixel(imageData, x, y).brightness;
        totalImportance += importanceAt(importanceMap, imgWidth, x, y);
        n++;
      }
    }

    return {
      brightness: n > 0 ? totalBrightness / n : 0.5,
      importance: n > 0 ? totalImportance / n : 0.5,
    };
  }

  const { x, y } = mapQrCoordToImagePixel(
    qrModuleX + 0.5,
    qrModuleY + 0.5,
    qrDimension,
    imgWidth,
    imgHeight
  );
  return {
    brightness: readImagePixel(imageData, x, y).brightness,
    importance: importanceAt(importanceMap, imgWidth, x, y),
  };
}

/**
 * Rasterize a transformed image to one brightness sample per QR module.
 * Uses the shared center sample — identical to sampleQrModule(..., { mode: "center" }).
 */
export function rasterizeImageToQRGrid(
  transformedImageData: ImageData,
  qrDimension: number
): Float32Array {
  if (!qrDimension || qrDimension <= 0 || !isFinite(qrDimension)) {
    throw new Error("Invalid qrDimension");
  }

  if (
    !transformedImageData ||
    !transformedImageData.width ||
    !transformedImageData.height
  ) {
    throw new Error("Invalid ImageData");
  }

  const grid = new Float32Array(qrDimension * qrDimension);
  for (let y = 0; y < qrDimension; y++) {
    for (let x = 0; x < qrDimension; x++) {
      grid[y * qrDimension + x] = sampleQrModule(
        transformedImageData,
        qrDimension,
        x,
        y
      ).brightness;
    }
  }
  return grid;
}
