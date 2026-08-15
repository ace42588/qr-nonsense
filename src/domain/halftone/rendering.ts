import {
  sampleQrModule,
  type ImageData,
  type SampleMode,
} from "@/domain/image";
import { choosePattern } from "./patterns";

export type HalftoneStyle = "pattern" | "dots";

/** Max diameter fraction of module side allowed by UI (covers √2 ≈ 1.41). */
export const DOT_SIZE_MAX = 1.5;

interface RenderContext {
  size: number;
  quietZone: number;
  moduleX: number;
  moduleY: number;
  x: number;
  y: number;
  dimension?: number;
  pass?: number;
  passes?: number;
}

interface HalftoneRenderOptions {
  transformedImageData: ImageData;
  importanceMap: ArrayLike<number>;
  patternsDark: number[][][];
  patternsLight: number[][][];
  modulePixel: number;
  reliabilityWeight?: number;
  importanceThreshold?: number; // If provided, only apply halftone when importance >= threshold
  sampleMode?: SampleMode;
  style?: HalftoneStyle;
  /** Dot diameter as fraction of module side (0 … DOT_SIZE_MAX). */
  minDotSize?: number;
  /** Dot diameter as fraction of module side (0 … DOT_SIZE_MAX). */
  maxDotSize?: number;
}

/**
 * Sample brightness and importance at the module center.
 * Delegates to the shared QArt/Halftone pipeline (sampleQrModule).
 */
export function sampleImageAtPoint(
  transformedImageData: ImageData,
  importanceMap: ArrayLike<number>,
  qrDimension: number,
  qrModuleX: number,
  qrModuleY: number
): { brightness: number; importance: number } {
  return sampleQrModule(transformedImageData, qrDimension, qrModuleX, qrModuleY, {
    mode: "center",
    importanceMap,
  });
}

/**
 * Sample brightness and importance across an entire module area.
 * Delegates to the shared QArt/Halftone pipeline (sampleQrModule, area mode).
 */
export function sampleImageAcrossModule(
  transformedImageData: ImageData,
  importanceMap: ArrayLike<number>,
  qrDimension: number,
  qrModuleX: number,
  qrModuleY: number,
  modulePixel: number
): { brightness: number; importance: number } {
  return sampleQrModule(transformedImageData, qrDimension, qrModuleX, qrModuleY, {
    mode: "area",
    modulePixel,
    importanceMap,
  });
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
 * Ensure minDotSize ≤ maxDotSize and both sit in [0, DOT_SIZE_MAX].
 */
export function clampDotSizes(
  minDotSize: number,
  maxDotSize: number
): { minDotSize: number; maxDotSize: number } {
  const clamp = (v: number) => Math.min(DOT_SIZE_MAX, Math.max(0, v));
  let min = clamp(minDotSize);
  let max = clamp(maxDotSize);
  if (min > max) {
    const mid = min;
    min = max;
    max = mid;
  }
  return { minDotSize: min, maxDotSize: max };
}

/**
 * Map sampled brightness to ink-dot diameter in canvas pixels.
 * t = 1 - brightness for dark modules, brightness for light modules
 * (more of the module's ink color when the image agrees).
 */
export function dotDiameterForModule(
  brightness: number,
  isDark: boolean,
  moduleSize: number,
  minDotSize: number,
  maxDotSize: number
): number {
  const { minDotSize: min, maxDotSize: max } = clampDotSizes(minDotSize, maxDotSize);
  const t = isDark ? 1 - brightness : brightness;
  const fraction = min + (max - min) * Math.min(1, Math.max(0, t));
  return fraction * moduleSize;
}

/**
 * Pass 0: for dark modules, fill white so the black dot sits on a light field.
 * Light modules need no background fill (canvas stays white; white dots punch
 * through any overflowing ink from neighbors on pass 1).
 */
export function renderHalftoneDotBackground(
  ctx: CanvasRenderingContext2D,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  isDark: boolean
): void {
  if (!isDark) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "white";
  ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
}

/**
 * Pass 1: draw a centered circle that may overflow module bounds (no clip).
 */
export function renderHalftoneDot(
  ctx: CanvasRenderingContext2D,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  isDark: boolean,
  diameter: number
): void {
  if (diameter <= 0) return;
  const radius = diameter / 2;
  const cx = moduleX + moduleSize / 2;
  const cy = moduleY + moduleSize / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "black" : "white";
  ctx.fill();
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

function sampleForHalftone(
  options: HalftoneRenderOptions,
  renderCtx: RenderContext
): { brightness: number; importance: number } | null {
  const {
    transformedImageData,
    importanceMap,
    modulePixel,
    sampleMode = "center",
  } = options;
  const { x, y, dimension } = renderCtx;
  if (!dimension) return null;

  return sampleQrModule(transformedImageData, dimension, x, y, {
    mode: sampleMode,
    modulePixel,
    importanceMap,
  });
}

function renderDotsModule(
  ctx: CanvasRenderingContext2D,
  module: any,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  renderCtx: RenderContext,
  options: HalftoneRenderOptions
): void {
  const pass = renderCtx.pass ?? 0;
  const sampled = sampleForHalftone(options, renderCtx);
  if (!sampled) {
    if (pass === 0) {
      renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    }
    return;
  }

  const { brightness, importance } = sampled;
  const { importanceThreshold, minDotSize = 0.25, maxDotSize = 1.0 } = options;

  if (importanceThreshold !== undefined && importance < importanceThreshold) {
    if (pass === 0) {
      renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    }
    return;
  }

  if (pass === 0) {
    renderHalftoneDotBackground(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  if (pass === 1) {
    const diameter = dotDiameterForModule(
      brightness,
      module.isDark,
      moduleSize,
      minDotSize,
      maxDotSize
    );
    renderHalftoneDot(ctx, moduleX, moduleY, moduleSize, module.isDark, diameter);
  }
}

/**
 * Render a module with a halftone pattern. Sampling uses the shared
 * QArt/Halftone pipeline (`sampleQrModule`). Default is module-center
 * (same pixel QArt rasterizes). Pass sampleMode: "area" for Combined.
 *
 * For style "dots", backgrounds draw on pass 0 and circles on pass 1
 * (caller should set renderPasses={2}). Pattern style only paints on pass 0.
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

  const pass = renderCtx.pass ?? 0;
  const style: HalftoneStyle = options.style ?? "pattern";

  if (module.nonData) {
    if (pass === 0) {
      renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    }
    return;
  }

  if (style === "dots") {
    renderDotsModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx, options);
    return;
  }

  // Pattern style only renders on the first pass
  if (pass !== 0) return;

  const {
    patternsDark,
    patternsLight,
    modulePixel,
    reliabilityWeight = 0.0,
    importanceThreshold,
  } = options;

  const patterns = module.isDark ? patternsDark : patternsLight;
  if (!validatePatterns(patterns)) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  const sampled = sampleForHalftone(options, renderCtx);
  if (!sampled) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  const { brightness, importance } = sampled;

  if (importanceThreshold !== undefined && importance < importanceThreshold) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  const pattern = choosePattern(patterns, brightness, importance, reliabilityWeight);

  if (!validatePattern(pattern)) {
    renderSolidModule(ctx, moduleX, moduleY, moduleSize, module.isDark);
    return;
  }

  renderHalftonePattern(ctx, pattern, moduleX, moduleY, moduleSize, modulePixel);
}

/**
 * Combined / QArt+halftone: area-sample each module, then render.
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
  renderHalftoneModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
    ...options,
    sampleMode: "area",
  });
}
