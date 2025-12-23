import { useMemo } from "react";
import { generatePatterns } from "@/domain/halftone/patterns";
import { computeImportanceMap } from "@/domain/image";
import { ImageData } from "@/domain/image";

interface UseHalftonePatternsParams {
  transformedImageData: ImageData | null;
  canvasSize: number;
  importanceWeight?: number;
}

interface UseHalftonePatternsReturn {
  patternsDark: number[][][];
  patternsLight: number[][][];
  importanceMap: number[] | null;
}

/**
 * Hook that generates halftone patterns (dark and light) and computes importance map
 * for image-based halftone rendering.
 */
export function useHalftonePatterns({
  transformedImageData,
  canvasSize,
  importanceWeight = 0.5,
}: UseHalftonePatternsParams): UseHalftonePatternsReturn {
  // Generate patterns once - they don't depend on image data
  const patternsDark = useMemo(() => generatePatterns(1), []);
  const patternsLight = useMemo(() => generatePatterns(0), []);

  // Compute importance map from pre-transformed image data
  const importanceMap = useMemo(() => {
    if (!transformedImageData || !canvasSize) return null;
    return computeImportanceMap(transformedImageData, canvasSize, importanceWeight);
  }, [transformedImageData, canvasSize, importanceWeight]);

  return {
    patternsDark,
    patternsLight,
    importanceMap,
  };
}

