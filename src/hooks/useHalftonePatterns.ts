import { useMemo } from "react";
import { generatePatterns } from "@/domain/halftone/patterns";
import { computeImportanceMap } from "@/domain/image";
import type { ImageData } from "@/domain/image";

interface UseHalftonePatternsParams {
  transformedImageData: ImageData | null;
  canvasSize: number;
  importanceWeight?: number;
  frames?: ImageData[] | null;
  frameIndex?: number;
}

interface UseHalftonePatternsReturn {
  patternsDark: number[][][];
  patternsLight: number[][][];
  importanceMap: Float32Array | null;
  importanceMaps: Float32Array[] | null;
}

/**
 * Hook that generates halftone patterns (dark and light) and computes importance map
 * for image-based halftone rendering. Animated sources cache one map per frame.
 */
export function useHalftonePatterns({
  transformedImageData,
  canvasSize: _canvasSize,
  importanceWeight = 0.5,
  frames = null,
  frameIndex = 0,
}: UseHalftonePatternsParams): UseHalftonePatternsReturn {
  const patternsDark = useMemo(() => generatePatterns(1), []);
  const patternsLight = useMemo(() => generatePatterns(0), []);

  const importanceMaps = useMemo(() => {
    if (!frames || frames.length <= 1) return null;
    return frames.map((frame) =>
      computeImportanceMap(frame, frame.width, importanceWeight)
    );
  }, [frames, importanceWeight]);

  const importanceMap = useMemo(() => {
    if (importanceMaps) {
      return importanceMaps[frameIndex] ?? importanceMaps[0] ?? null;
    }
    if (!transformedImageData) return null;
    const imageSize = transformedImageData.width;
    if (transformedImageData.width !== transformedImageData.height) {
      console.warn("useHalftonePatterns: Image is not square, using width as size");
    }
    return computeImportanceMap(transformedImageData, imageSize, importanceWeight);
  }, [transformedImageData, importanceWeight, importanceMaps, frameIndex]);

  return {
    patternsDark,
    patternsLight,
    importanceMap,
    importanceMaps,
  };
}
