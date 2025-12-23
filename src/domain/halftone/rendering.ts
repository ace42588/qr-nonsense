import { getBrightness } from "@/domain/image";
import { choosePattern } from "./patterns";
import { ImageData } from "@/domain/image";

interface RenderContext {
  size: number;
  quietZone: number;
  moduleX: number;
  moduleY: number;
  x: number;
  y: number;
}

interface HalftoneRenderOptions {
  transformedImageData: ImageData;
  importanceMap: number[];
  patternsDark: number[][][];
  patternsLight: number[][][];
  modulePixel: number;
  reliabilityWeight?: number;
}

/**
 * Sample brightness and importance at a single point (center of module)
 * Maps QR module coordinates to image pixel coordinates using the same mapping as rasterizeImageToQRGrid
 */
export function sampleImageAtPoint(
  transformedImageData: ImageData,
  importanceMap: number[],
  qrDimension: number,
  qrModuleX: number,
  qrModuleY: number
): { brightness: number; importance: number } {
  const imgWidth = transformedImageData.width;
  const imgHeight = transformedImageData.height;
  
  // Map QR module position (0 to qrDimension-1) to image pixel position (0 to imgWidth-1)
  // This matches the mapping used in rasterizeImageToQRGrid for consistency
  const imgX = Math.floor((qrModuleX / qrDimension) * imgWidth);
  const imgY = Math.floor((qrModuleY / qrDimension) * imgHeight);
  
  // Clamp to image bounds
  const safeX = Math.max(0, Math.min(imgWidth - 1, imgX));
  const safeY = Math.max(0, Math.min(imgHeight - 1, imgY));
  const idx = (safeY * imgWidth + safeX) * 4;
  
  const r = transformedImageData.data[idx];
  const g = transformedImageData.data[idx + 1];
  const b = transformedImageData.data[idx + 2];
  const brightness = getBrightness(r, g, b) / 255;
  const importance = importanceMap[safeY * imgWidth + safeX] || 0;
  
  return { brightness, importance };
}

/**
 * Sample brightness and importance across an entire module area
 * Returns average brightness and importance
 * Maps QR module coordinates to image pixel coordinates using the same mapping as rasterizeImageToQRGrid
 */
export function sampleImageAcrossModule(
  transformedImageData: ImageData,
  importanceMap: number[],
  qrDimension: number,
  qrModuleX: number,
  qrModuleY: number,
  modulePixel: number
): { brightness: number; importance: number } {
  const imgWidth = transformedImageData.width;
  const imgHeight = transformedImageData.height;
  
  let totalBrightness = 0;
  let totalImportance = 0;
  let sampleCount = 0;
  
  // Sample at sub-pixel positions within the QR module
  // Map each sub-pixel position to image pixel coordinates
  for (let sy = 0; sy < modulePixel; ++sy) {
    for (let sx = 0; sx < modulePixel; ++sx) {
      // Calculate sub-pixel position within the QR module (0.0 to 1.0)
      const subPixelX = qrModuleX + (sx + 0.5) / modulePixel;
      const subPixelY = qrModuleY + (sy + 0.5) / modulePixel;
      
      // Map QR module position to image pixel position (same as rasterizeImageToQRGrid)
      const imgX = Math.floor((subPixelX / qrDimension) * imgWidth);
      const imgY = Math.floor((subPixelY / qrDimension) * imgHeight);
      
      // Clamp to image bounds
      const safeX = Math.max(0, Math.min(imgWidth - 1, imgX));
      const safeY = Math.max(0, Math.min(imgHeight - 1, imgY));
      const idx = (safeY * imgWidth + safeX) * 4;
      
      const r = transformedImageData.data[idx];
      const g = transformedImageData.data[idx + 1];
      const b = transformedImageData.data[idx + 2];
      const brightness = getBrightness(r, g, b) / 255;
      const importance = importanceMap[safeY * imgWidth + safeX] || 0;
      
      totalBrightness += brightness;
      totalImportance += importance;
      sampleCount++;
    }
  }
  
  // Use average brightness and importance across the module area
  const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 0.5;
  const avgImportance = sampleCount > 0 ? totalImportance / sampleCount : 0.5;
  
  return { brightness: avgBrightness, importance: avgImportance };
}

/**
 * Validate that patterns array is valid
 */
export function validatePatterns(patterns: number[][][]): boolean {
  return (
    patterns &&
    Array.isArray(patterns) &&
    patterns.length > 0 &&
    patterns.every(
      (pattern) =>
        pattern &&
        Array.isArray(pattern) &&
        pattern.length > 0 &&
        pattern.every((row) => row && Array.isArray(row))
    )
  );
}

/**
 * Validate that a single pattern is valid
 */
export function validatePattern(pattern: number[][]): boolean {
  return (
    pattern &&
    Array.isArray(pattern) &&
    pattern.length > 0 &&
    pattern.every((row) => row && Array.isArray(row))
  );
}

/**
 * Render a halftone pattern to canvas context
 */
export function renderHalftonePattern(
  ctx: CanvasRenderingContext2D,
  pattern: number[][],
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  modulePixel: number
): void {
  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;
  
  const subSize = moduleSize / modulePixel;
  
  // Calculate boundaries for edge-to-edge alignment
  const getSubStart = (index: number) => Math.floor(moduleX + index * subSize);
  const getSubEnd = (index: number) => Math.ceil(moduleX + (index + 1) * subSize);
  
  for (let sy = 0; sy < modulePixel; ++sy) {
    if (!pattern[sy] || !Array.isArray(pattern[sy])) {
      continue; // Skip invalid rows
    }
    const subY = Math.floor(moduleY + sy * subSize);
    const subYEnd = Math.ceil(moduleY + (sy + 1) * subSize);
    const subHeight = subYEnd - subY;
    
    for (let sx = 0; sx < modulePixel; ++sx) {
      const subX = getSubStart(sx);
      const subXEnd = getSubEnd(sx);
      const subWidth = subXEnd - subX;
      
      // Use exact calculated dimensions for edge-to-edge coverage
      ctx.fillStyle = pattern[sy][sx] ? "#111" : "#fff";
      ctx.fillRect(subX, subY, subWidth, subHeight);
    }
  }
}

/**
 * Render a solid color module (fallback when patterns are invalid)
 */
export function renderSolidModule(
  ctx: CanvasRenderingContext2D,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  isDark: boolean
): void {
  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;
  
  // Round coordinates to integers for pixel-perfect rendering
  const roundedX = Math.round(moduleX);
  const roundedY = Math.round(moduleY);
  const roundedSize = Math.round(moduleSize);
  
  ctx.fillStyle = isDark ? "black" : "white";
  ctx.fillRect(roundedX, roundedY, roundedSize, roundedSize);
}

/**
 * Render a module with halftone pattern, with validation and fallback
 */
export function renderHalftoneModule(
  ctx: CanvasRenderingContext2D,
  module: any,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  renderCtx: RenderContext,
  options: HalftoneRenderOptions
): void {
  if (!module) return;

  // For non-data modules (finders, timing, format patterns), render normally
  if (module.nonData) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  const {
    transformedImageData,
    importanceMap,
    patternsDark,
    patternsLight,
    modulePixel,
    reliabilityWeight = 0.0,
  } = options;

  // Validate patterns before use
  const patterns = module.isDark ? patternsDark : patternsLight;
  if (!validatePatterns(patterns)) {
    // Fallback: render solid color if patterns are invalid
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  // Sample image to get brightness and importance
  // Use QR module coordinates (x, y) from renderCtx to map to image pixels consistently with QArt
  const { x, y, dimension } = renderCtx;
  if (!dimension) {
    // Fallback: render solid color if dimension not available
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }
  const { brightness, importance } = sampleImageAtPoint(
    transformedImageData,
    importanceMap,
    dimension,
    x,
    y
  );

  // Choose pattern based on image brightness
  const pattern = choosePattern(patterns, brightness, importance, reliabilityWeight);

  // Validate pattern before use
  if (!validatePattern(pattern)) {
    // Fallback: render solid color if pattern is invalid
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  // Render the selected halftone pattern
  renderHalftonePattern(ctx, pattern, moduleX, moduleY, moduleSize, modulePixel);
}

/**
 * Render a module with halftone pattern using area sampling (for combined QArt+Halftone)
 */
export function renderHalftoneModuleWithAreaSampling(
  ctx: CanvasRenderingContext2D,
  module: any,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  renderCtx: RenderContext,
  options: HalftoneRenderOptions
): void {
  if (!module) return;

  // For non-data modules (finders, timing, format patterns), render normally
  if (module.nonData) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  const {
    transformedImageData,
    importanceMap,
    patternsDark,
    patternsLight,
    modulePixel,
    reliabilityWeight = 0.0,
  } = options;

  // Validate patterns before use
  const patterns = module.isDark ? patternsDark : patternsLight;
  if (!validatePatterns(patterns)) {
    // Fallback: render solid color if patterns are invalid
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  // Sample image across the entire module area
  // Use QR module coordinates (x, y) from renderCtx to map to image pixels consistently with QArt
  const { x, y, dimension } = renderCtx;
  if (!dimension) {
    // Fallback: render solid color if dimension not available
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }
  const { brightness, importance } = sampleImageAcrossModule(
    transformedImageData,
    importanceMap,
    dimension,
    x,
    y,
    modulePixel
  );

  // Choose pattern based on average brightness
  const pattern = choosePattern(patterns, brightness, importance, reliabilityWeight);

  // Validate pattern before use
  if (!validatePattern(pattern)) {
    // Fallback: render solid color if pattern is invalid
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  // Render the selected halftone pattern
  renderHalftonePattern(ctx, pattern, moduleX, moduleY, moduleSize, modulePixel);
}

