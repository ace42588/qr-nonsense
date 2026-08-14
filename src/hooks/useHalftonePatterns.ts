import { useMemo } from "react";
import { generatePatterns } from "@/domain/halftone/patterns";
import { computeImportanceMap } from "@/domain/image";
import type { ImageData } from "@/domain/image";

interface UseHalftonePatternsParams {
  transformedImageData: ImageData | null;
  canvasSize: number;
  importanceWeight?: number;
}

interface UseHalftonePatternsReturn {
  patternsDark: number[][][];
  patternsLight: number[][][];
  importanceMap: Float32Array | null;
}

/**
 * Hook that generates halftone patterns (dark and light) and computes importance map
 * for image-based halftone rendering.
 */
export function useHalftonePatterns({
  transformedImageData,
  canvasSize: _canvasSize, // Unused but kept for API compatibility
  importanceWeight = 0.5,
}: UseHalftonePatternsParams): UseHalftonePatternsReturn {
  // Generate patterns once - they don't depend on image data
  const patternsDark = useMemo(() => generatePatterns(1), []);
  const patternsLight = useMemo(() => generatePatterns(0), []);

  // Compute importance map from pre-transformed image data
  // CRITICAL: Use the actual image dimensions, not the canvasSize parameter
  // The image data dimensions must match the importance map dimensions
  const importanceMap = useMemo(() => {
    if (!transformedImageData) {
      return null;
    }
    
    // Use actual image dimensions for importance map computation
    // The image must be square for computeImportanceMap to work correctly
    const imageSize = transformedImageData.width;
    if (transformedImageData.width !== transformedImageData.height) {
      console.warn('useHalftonePatterns: Image is not square, using width as size');
    }
    
    const result = computeImportanceMap(transformedImageData, imageSize, importanceWeight);
    return result;
  }, [transformedImageData, importanceWeight]); // Removed canvasSize from dependencies

  return {
    patternsDark,
    patternsLight,
    importanceMap,
  };
}

