import { useState, useCallback, useRef, useEffect } from "react";
import { generateQArt, generateQArtForFrames, QArtResult } from "@/domain/qart";
import { QRMatrix, Segment, Codeword } from "@/domain/shared/types";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { VersionInfo } from "@/domain/qr/versionUtils";
import type { ImageData } from "@/domain/image";
import type { QArtAppendData } from "@/domain/qart";

interface QArtGenerationOptions {
  priorityFunction?: "contrast" | "random" | "roi";
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
  sourceImage?: HTMLImageElement | ImageData | null;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null;
  isAnimated?: boolean;
  sourceFrames?: ImageData[];
  transformedFrames?: ImageData[];
}

export interface GenerationProgress {
  current: number;
  total: number;
}

interface UseQArtGenerationReturn {
  isGenerating: boolean;
  generationError: string | null;
  generateQArtCode: () => Promise<void>;
  frameResults: QArtResult[];
  generationProgress: GenerationProgress | null;
}

function buildQArtOptions(args: {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  initialMatrix: QRMatrix;
  versionInfo: VersionInfo;
  errorCorrectionLevel: number;
  targetImage: ImageData;
  signal: AbortSignal;
  priorityFunction?: "contrast" | "random" | "roi";
  appendData?: QArtGenerationOptions["appendData"];
  minDecodeRedundancy?: number;
  decodeTrials?: number;
  frameSource?: HTMLImageElement | ImageData | null;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null;
}): Parameters<typeof generateQArt>[0] {
  const generateOptions: Parameters<typeof generateQArt>[0] = {
    segments: args.segments,
    codewords: args.codewords,
    blocks: args.blocks,
    initialMatrix: args.initialMatrix,
    versionInfo: args.versionInfo,
    errorCorrectionLevel: args.errorCorrectionLevel,
    targetImage: args.targetImage,
    signal: args.signal,
  };

  if (args.priorityFunction) {
    generateOptions.priorityFunction = args.priorityFunction;
  }
  if (args.appendData?.enabled) {
    generateOptions.appendData = args.appendData as QArtAppendData;
  }
  if (args.minDecodeRedundancy != null) {
    generateOptions.minDecodeRedundancy = args.minDecodeRedundancy;
  }
  if (args.decodeTrials != null) {
    generateOptions.decodeTrials = args.decodeTrials;
  }
  if (args.frameSource && args.transformParams) {
    generateOptions.sourceImage = args.frameSource;
    generateOptions.transformParams = args.transformParams;
  }
  return generateOptions;
}

/**
 * Hook for managing QArt QR code generation with abort controller, error handling,
 * and debounced auto-generation. Animated sources generate one result per frame.
 */
export function useQArtGeneration(
  params: UseQArtGenerationParams
): UseQArtGenerationReturn {
  const {
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    transformedImageData,
    isLoadingTransform,
    setQartResult,
    options = {},
    debounceMs = 300,
    autoGenerate = true,
    sourceImage,
    transformParams,
    isAnimated = false,
    sourceFrames = [],
    transformedFrames = [],
  } = params;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [frameResults, setFrameResults] = useState<QArtResult[]>([]);
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  const { priorityFunction = "contrast", appendData, minDecodeRedundancy, decodeTrials } = options;

  const imageReady = isAnimated
    ? sourceFrames.length > 1 && transformedFrames.length === sourceFrames.length
    : !!sourceImage;

  const generateQArtCode = useCallback(async () => {
    if (!imageReady) {
      setGenerationError("No image loaded. Please upload an image to generate QArt QR codes.");
      setQartResult(null);
      setFrameResults([]);
      return;
    }

    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input in the left panel.");
      setQartResult(null);
      setFrameResults([]);
      return;
    }

    if (!transformedImageData) {
      setGenerationError("No transformed image available. Please wait for the image to finish loading.");
      setQartResult(null);
      setFrameResults([]);
      return;
    }

    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }

    const abortController = new AbortController();
    searchControllerRef.current = abortController;

    setIsGenerating(true);
    setGenerationError(null);
    setQartResult(null);
    setFrameResults([]);
    setGenerationProgress(null);

    try {
      if (isAnimated && sourceFrames.length > 1) {
        const total = sourceFrames.length;
        setGenerationProgress({ current: 0, total });
        const results = await generateQArtForFrames(
          buildQArtOptions({
            segments: segments!,
            codewords: codewords!,
            blocks: blocks!,
            initialMatrix: contextMatrix!,
            versionInfo: versionInfo!,
            errorCorrectionLevel,
            targetImage: transformedFrames[0] ?? transformedImageData,
            signal: abortController.signal,
            priorityFunction,
            appendData,
            minDecodeRedundancy,
            decodeTrials,
            frameSource: sourceFrames[0],
            transformParams,
          }),
          sourceFrames.map((frameSource, i) => ({
            targetImage: transformedFrames[i] ?? transformedImageData,
            sourceImage: frameSource,
          })),
          (current, progressTotal) => {
            setGenerationProgress({ current, total: progressTotal });
          }
        );
        if (abortController.signal.aborted) return;
        setFrameResults(results);
        setQartResult(results[0] ?? null);
        setGenerationError(null);
        setGenerationProgress(null);
        return;
      }

      const result = await generateQArt(
        buildQArtOptions({
          segments: segments!,
          codewords: codewords!,
          blocks: blocks!,
          initialMatrix: contextMatrix!,
          versionInfo: versionInfo!,
          errorCorrectionLevel,
          targetImage: transformedImageData,
          signal: abortController.signal,
          priorityFunction,
          appendData,
          minDecodeRedundancy,
          decodeTrials,
          frameSource: sourceImage,
          transformParams,
        })
      );

      if (!abortController.signal.aborted && result) {
        setFrameResults([result]);
        setQartResult(result);
        setGenerationError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("cancelled")) {
        return;
      }
      console.error("Error generating QArt:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate QArt QR code"
      );
    } finally {
      if (searchControllerRef.current === abortController) {
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    }
  }, [
    segments,
    codewords,
    blocks,
    contextMatrix,
    errorCorrectionLevel,
    versionInfo,
    priorityFunction,
    appendData,
    sourceImage,
    transformParams,
    transformedImageData,
    setQartResult,
    imageReady,
    isAnimated,
    sourceFrames,
    transformedFrames,
    minDecodeRedundancy,
    decodeTrials,
  ]);

  useEffect(() => {
    if (!autoGenerate) return;
    if (isLoadingTransform || !imageReady || !segments || segments.length === 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      generateQArtCode();
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    sourceImage,
    transformParams,
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    priorityFunction,
    appendData?.enabled,
    appendData?.method,
    appendData?.separator,
    appendData?.encodingMode,
    isLoadingTransform,
    generateQArtCode,
    autoGenerate,
    debounceMs,
    imageReady,
    isAnimated,
    sourceFrames,
    transformedFrames,
  ]);

  return {
    isGenerating,
    generationError,
    generateQArtCode,
    frameResults,
    generationProgress,
  };
}
