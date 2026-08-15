import { useState, useCallback, useRef, useEffect } from "react";
import { generateQArt, QArtResult } from "@/domain/qart";
import { QRMatrix, Segment, Codeword } from "@/domain/shared/types";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { VersionInfo } from "@/domain/qr/versionUtils";
import type { ImageData } from "@/domain/image";
import type { QArtAppendData } from "@/domain/qart";

interface QArtGenerationOptions {
  priorityFunction?: "contrast" | "random";
  appendData?: {
    enabled: boolean;
    method: "existing" | "new";
    separator?: string;
    encodingMode?: "numeric" | "alphanumeric" | "byte";
  };
  minDecodeRedundancy?: number;
  decodeTrials?: number;
}

interface UseQArtGenerationParams {
  segments: Segment[] | null;
  codewords: Codeword[] | null;
  blocks: QRBlock[] | null;
  contextMatrix: QRMatrix | null;
  versionInfo: VersionInfo | null;
  errorCorrectionLevel: number;
  transformedImageData: ImageData | null;
  isLoadingTransform: boolean;
  qartResult: QArtResult | null;
  setQartResult: (result: QArtResult | null) => void;
  options?: QArtGenerationOptions;
  debounceMs?: number;
  autoGenerate?: boolean;
  // Source image and transform params for offscreen canvas
  sourceImage?: HTMLImageElement | null;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null;
}

interface UseQArtGenerationReturn {
  isGenerating: boolean;
  generationError: string | null;
  generateQArtCode: () => Promise<void>;
}

/**
 * Hook for managing QArt QR code generation with abort controller, error handling,
 * and debounced auto-generation.
 */
export function useQArtGeneration({
  segments,
  codewords,
  blocks,
  contextMatrix,
  versionInfo,
  errorCorrectionLevel,
  transformedImageData,
  isLoadingTransform,
  qartResult: _qartResult,
  setQartResult,
  options = {},
  debounceMs = 300,
  autoGenerate = true,
  sourceImage,
  transformParams,
}: UseQArtGenerationParams): UseQArtGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  const {
    priorityFunction = "contrast",
    appendData,
    minDecodeRedundancy,
    decodeTrials,
  } = options;

  // Generate QArt QR code - automatically triggered by state changes
  const generateQArtCode = useCallback(async () => {
    // Image requirement validation
    // CRITICAL: Check sourceImage for offscreen canvas, not transformedImageData
    // transformedImageData changes with window resize, but sourceImage is stable
    if (!sourceImage) {
      setGenerationError("No image loaded. Please upload an image to generate QArt QR codes.");
      setQartResult(null);
      return;
    }

    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input in the left panel.");
      setQartResult(null);
      return;
    }

    if (!transformedImageData) {
      setGenerationError("No transformed image available. Please wait for the image to finish loading.");
      setQartResult(null);
      return;
    }

    // Cancel any ongoing generation
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }

    // Create new AbortController for this generation
    const abortController = new AbortController();
    searchControllerRef.current = abortController;

    setIsGenerating(true);
    setGenerationError(null);
    setQartResult(null);

    try {
      const generateOptions: Parameters<typeof generateQArt>[0] = {
        segments,
        codewords: codewords!,
        blocks: blocks!,
        initialMatrix: contextMatrix!,
        versionInfo: versionInfo!,
        errorCorrectionLevel,
        targetImage: transformedImageData,
        signal: abortController.signal,
      };

      // Add optional parameters
      if (priorityFunction) {
        generateOptions.priorityFunction = priorityFunction;
      }
      if (appendData?.enabled) {
        generateOptions.appendData = appendData as QArtAppendData;
      }
      if (minDecodeRedundancy != null) {
        generateOptions.minDecodeRedundancy = minDecodeRedundancy;
      }
      if (decodeTrials != null) {
        generateOptions.decodeTrials = decodeTrials;
      }
      // Add source image and transform params for offscreen canvas
      if (sourceImage && transformParams) {
        generateOptions.sourceImage = sourceImage;
        generateOptions.transformParams = transformParams;
      }

      const result = await generateQArt(generateOptions);

      // Only update state if not cancelled
      if (!abortController.signal.aborted && result) {
        setQartResult(result);
        setGenerationError(null);
      }
    } catch (err) {
      // Don't set error if cancellation was intentional
      if (err instanceof Error && err.message.includes("cancelled")) {
        // Cancellation is expected, don't show error
        return;
      }
      console.error("Error generating QArt:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate QArt QR code"
      );
    } finally {
      // Only clear generating state if this is still the current generation
      if (searchControllerRef.current === abortController) {
        setIsGenerating(false);
      }
    }
  }, [
    // CRITICAL: Do NOT include transformedImageData in dependencies
    // transformedImageData changes when canvasSize changes (visible canvas),
    // but QArt uses offscreen canvas (sourceImage + transformParams) which is stable
    // Including transformedImageData would cause QArt regeneration on window resize
    segments,
    codewords,
    blocks,
    contextMatrix,
    errorCorrectionLevel,
    versionInfo,
    priorityFunction,
    appendData,
    minDecodeRedundancy,
    decodeTrials,
    sourceImage,
    transformParams,
    transformedImageData,
    setQartResult,
  ]);

  // Automatically generate QArt when dependencies change
  // Debounce rapid changes (like slider movements) to avoid excessive regeneration
  useEffect(() => {
    if (!autoGenerate) return;

    // Don't generate if image is still loading or if we don't have required data
    // CRITICAL: Check sourceImage instead of transformedImageData for offscreen canvas
    if (isLoadingTransform || !sourceImage || !segments || segments.length === 0) {
      return;
    }

    // Debounce rapid changes (especially for sliders)
    const timeoutId = setTimeout(() => {
      generateQArtCode();
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      // Note: Abort is handled in generateQArtCode when it's called again
    };
  }, [
    // CRITICAL: Do NOT include transformedImageData in dependencies
    // Use sourceImage instead - it's stable and doesn't change with window resize
    sourceImage,
    // transformParams is memoized in the component, so it only changes when scale/offset change
    transformParams,
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    priorityFunction,
    // appendData object reference might change - use deep comparison or extract values
    appendData?.enabled,
    appendData?.method,
    appendData?.separator,
    appendData?.encodingMode,
    isLoadingTransform,
    generateQArtCode,
    autoGenerate,
    debounceMs,
  ]);

  return {
    isGenerating,
    generationError,
    generateQArtCode,
  };
}
