import { useState, useCallback, useRef, useEffect } from "react";
import { generateIsqr, generateIsqrForFrames, type IsqrResult } from "@/domain/isqr";
import type { QArtResult } from "@/domain/qart";
import { QRMatrix, Segment, Codeword } from "@/domain/shared/types";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { VersionInfo } from "@/domain/qr/versionUtils";
import type { ImageData } from "@/domain/image";
import type { GenerationProgress } from "@/hooks/useQArtGeneration";

export interface IsqrGenerationOptions {
  roiThresholdBias?: number;
  modulePixel?: number;
  csfStrength?: number;
  printDpi?: number;
  viewingDistanceInches?: number;
  qrBlend?: number;
  maskImage?: ImageData | null;
  minDecodeRedundancy?: number;
  decodeTrials?: number;
}

interface UseIsqrGenerationParams {
  segments: Segment[] | null;
  codewords: Codeword[] | null;
  blocks: QRBlock[] | null;
  contextMatrix: QRMatrix | null;
  versionInfo: VersionInfo | null;
  errorCorrectionLevel: number;
  transformedImageData: ImageData | null;
  isLoadingTransform: boolean;
  setQartResult: (result: QArtResult | null) => void;
  options?: IsqrGenerationOptions;
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

interface UseIsqrGenerationReturn {
  isGenerating: boolean;
  generationError: string | null;
  isqrResult: IsqrResult | null;
  generateIsqrCode: () => Promise<void>;
  frameResults: IsqrResult[];
  generationProgress: GenerationProgress | null;
}

/**
 * Abortable, debounced IS-QR generation. Animated sources generate per frame
 * with auto ROI only (no mask).
 */
export function useIsqrGeneration({
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
  debounceMs = 350,
  autoGenerate = true,
  sourceImage,
  transformParams,
  isAnimated = false,
  sourceFrames = [],
  transformedFrames = [],
}: UseIsqrGenerationParams): UseIsqrGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isqrResult, setIsqrResult] = useState<IsqrResult | null>(null);
  const [frameResults, setFrameResults] = useState<IsqrResult[]>([]);
  const [generationProgress, setGenerationProgress] =
    useState<GenerationProgress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const {
    roiThresholdBias = 0,
    modulePixel = 3,
    csfStrength = 0.5,
    printDpi = 300,
    viewingDistanceInches = 12,
    qrBlend = 0.55,
    maskImage = null,
    minDecodeRedundancy = 0.8,
    decodeTrials = 1,
  } = options;

  const imageReady = isAnimated
    ? sourceFrames.length > 1 && transformedFrames.length === sourceFrames.length
    : !!sourceImage;

  const generateIsqrCode = useCallback(async () => {
    if (!imageReady) {
      setGenerationError("No image loaded. Please upload an image for IS-QR.");
      setQartResult(null);
      setIsqrResult(null);
      setFrameResults([]);
      return;
    }
    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input.");
      setQartResult(null);
      setIsqrResult(null);
      setFrameResults([]);
      return;
    }
    if (!transformedImageData) {
      setGenerationError("No transformed image available.");
      setQartResult(null);
      setIsqrResult(null);
      setFrameResults([]);
      return;
    }
    if (!codewords || !blocks || !contextMatrix || !versionInfo) {
      setGenerationError("QR data is not ready yet.");
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const abortController = new AbortController();
    controllerRef.current = abortController;

    setIsGenerating(true);
    setGenerationError(null);
    setQartResult(null);
    setIsqrResult(null);
    setFrameResults([]);
    setGenerationProgress(null);

    const runOne = async (target: ImageData, frameSource: HTMLImageElement | ImageData | null | undefined) => {
      return generateIsqr({
        transformedImage: target,
        maskImage: isAnimated ? null : maskImage,
        roiThresholdBias,
        modulePixel,
        qrBlend,
        csf: {
          strength: csfStrength,
          printDpi,
          viewingDistanceInches,
        },
        qart: {
          segments,
          codewords,
          blocks,
          initialMatrix: contextMatrix,
          versionInfo,
          errorCorrectionLevel,
          targetImage: target,
          signal: abortController.signal,
          minDecodeRedundancy,
          decodeTrials,
          sourceImage: frameSource ?? undefined,
          transformParams: transformParams ?? undefined,
        },
      });
    };

    try {
      if (isAnimated && sourceFrames.length > 1) {
        const total = sourceFrames.length;
        setGenerationProgress({ current: 0, total });
        const results = await generateIsqrForFrames(
          {
            transformedImage: transformedFrames[0] ?? transformedImageData,
            maskImage: null,
            roiThresholdBias,
            modulePixel,
            qrBlend,
            csf: {
              strength: csfStrength,
              printDpi,
              viewingDistanceInches,
            },
            qart: {
              segments,
              codewords,
              blocks,
              initialMatrix: contextMatrix,
              versionInfo,
              errorCorrectionLevel,
              targetImage: transformedFrames[0] ?? transformedImageData,
              signal: abortController.signal,
              minDecodeRedundancy,
              decodeTrials,
              sourceImage: sourceFrames[0],
              transformParams: transformParams ?? undefined,
            },
          },
          sourceFrames.map((frameSource, i) => ({
            transformedImage: transformedFrames[i] ?? transformedImageData,
            sourceImage: frameSource,
          })),
          (current, progressTotal) => {
            setGenerationProgress({ current, total: progressTotal });
          }
        );
        if (abortController.signal.aborted) return;
        setFrameResults(results);
        setIsqrResult(results[0] ?? null);
        setQartResult(results[0]?.qart ?? null);
        setGenerationError(null);
        setGenerationProgress(null);
        return;
      }

      const result = await runOne(transformedImageData, sourceImage);
      if (!abortController.signal.aborted) {
        setFrameResults([result]);
        setIsqrResult(result);
        setQartResult(result.qart);
        setGenerationError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("cancelled")) {
        return;
      }
      console.error("Error generating IS-QR:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate IS-QR"
      );
    } finally {
      if (controllerRef.current === abortController) {
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    }
  }, [
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    transformedImageData,
    sourceImage,
    transformParams,
    roiThresholdBias,
    modulePixel,
    csfStrength,
    printDpi,
    viewingDistanceInches,
    qrBlend,
    maskImage,
    minDecodeRedundancy,
    decodeTrials,
    setQartResult,
    imageReady,
    isAnimated,
    sourceFrames,
    transformedFrames,
  ]);

  useEffect(() => {
    if (!autoGenerate) return;
    if (isLoadingTransform || !imageReady || !segments || segments.length === 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      generateIsqrCode();
    }, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [
    autoGenerate,
    debounceMs,
    isLoadingTransform,
    sourceImage,
    transformParams,
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    roiThresholdBias,
    modulePixel,
    csfStrength,
    printDpi,
    viewingDistanceInches,
    qrBlend,
    maskImage,
    generateIsqrCode,
    imageReady,
    isAnimated,
    sourceFrames,
    transformedFrames,
  ]);

  return {
    isGenerating,
    generationError,
    isqrResult,
    generateIsqrCode,
    frameResults,
    generationProgress,
  };
}
