import { useState, useCallback, useRef, useEffect } from "react";
import { generateIsqr, type IsqrResult } from "@/domain/isqr";
import type { QArtResult } from "@/domain/qart";
import { QRMatrix, Segment, Codeword } from "@/domain/shared/types";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { VersionInfo } from "@/domain/qr/versionUtils";
import type { ImageData } from "@/domain/image";

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
  sourceImage?: HTMLImageElement | null;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null;
}

interface UseIsqrGenerationReturn {
  isGenerating: boolean;
  generationError: string | null;
  isqrResult: IsqrResult | null;
  generateIsqrCode: () => Promise<void>;
}

/**
 * Abortable, debounced IS-QR generation hook.
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
}: UseIsqrGenerationParams): UseIsqrGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isqrResult, setIsqrResult] = useState<IsqrResult | null>(null);
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

  const generateIsqrCode = useCallback(async () => {
    if (!sourceImage) {
      setGenerationError("No image loaded. Please upload an image for IS-QR.");
      setQartResult(null);
      setIsqrResult(null);
      return;
    }
    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input.");
      setQartResult(null);
      setIsqrResult(null);
      return;
    }
    if (!transformedImageData) {
      setGenerationError("No transformed image available.");
      setQartResult(null);
      setIsqrResult(null);
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

    try {
      const result = await generateIsqr({
        transformedImage: transformedImageData,
        maskImage,
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
          targetImage: transformedImageData,
          signal: abortController.signal,
          minDecodeRedundancy,
          decodeTrials,
          sourceImage: sourceImage ?? undefined,
          transformParams: transformParams ?? undefined,
        },
      });

      if (!abortController.signal.aborted) {
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
  ]);

  useEffect(() => {
    if (!autoGenerate) return;
    if (isLoadingTransform || !sourceImage || !segments || segments.length === 0) {
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
  ]);

  return {
    isGenerating,
    generationError,
    isqrResult,
    generateIsqrCode,
  };
}
