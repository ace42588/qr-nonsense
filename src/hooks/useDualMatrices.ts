import { useState, useEffect, useRef, useMemo } from "react";
import { useInputs } from "@/state/inputs/InputContext";
import type { AmbiguousResult } from "@/domain/ambiguous";
import type { EmbedResult } from "@/domain/embed";
import {
  generateAmbiguousViaPipeline,
  generateEmbedViaPipeline,
} from "@/domain/pipeline";
import type { CsfOptions } from "@/domain/isqr/csf";
import { LatestWinsScheduler } from "@/adapters/browser/workers/latestWins";
import { JobCancelledError } from "@/adapters/browser/workers/pool";

export interface DualMatricesOptions {
  phaseFlip?: boolean;
  /** Embed: center B region as fraction of module side. */
  centerSeed?: number;
  /** Embed: polarity push strength. */
  polarityStrength?: number;
  /** Embed: CSF post-process options. */
  csf?: CsfOptions;
  modulePixel?: number;
}

export function useDualMatrices(mode: "ambiguous" | "embed", options: DualMatricesOptions = {}) {
  const { inputs, inputsB, formatInfo } = useInputs();
  const { version, errorCorrectionLevel, dataMask } = formatInfo;
  const phaseFlip = Boolean(options.phaseFlip);
  const centerSeed = options.centerSeed ?? 0.35;
  const polarityStrength = options.polarityStrength ?? 0.9;
  const csfStrength = options.csf?.strength ?? 0.5;
  const modulePixel = options.modulePixel ?? 9;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{
    result: AmbiguousResult | EmbedResult | null;
    matrixA: AmbiguousResult["matrixA"];
    matrixB: AmbiguousResult["matrixB"];
    errorA: string | null;
    errorB: string | null;
    invalidReasonA: string | null;
    invalidReasonB: string | null;
    stats: AmbiguousResult["stats"] | null;
    phaseFlip: boolean;
    version: number;
    dataMask: number;
    fusedImage: ImageData | null;
    modulePixel: number;
    centerSeed: number;
  }>(() => ({
    result: null,
    matrixA: null,
    matrixB: null,
    errorA: null,
    errorB: null,
    invalidReasonA: null,
    invalidReasonB: null,
    stats: null,
    phaseFlip: false,
    version: 1,
    dataMask: 0,
    fusedImage: null,
    modulePixel: 3,
    centerSeed: 0,
  }));

  const schedulerRef = useRef<LatestWinsScheduler | null>(null);
  if (!schedulerRef.current) schedulerRef.current = new LatestWinsScheduler();

  const depsKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        version,
        errorCorrectionLevel,
        dataMask,
        phaseFlip,
        centerSeed,
        polarityStrength,
        csfStrength,
        modulePixel,
        inputs,
        inputsB,
      }),
    [
      mode,
      version,
      errorCorrectionLevel,
      dataMask,
      phaseFlip,
      centerSeed,
      polarityStrength,
      csfStrength,
      modulePixel,
      inputs,
      inputsB,
    ]
  );

  useEffect(() => {
    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    scheduler.schedule(async (signal) => {
      setIsGenerating(true);
      setGenerationError(null);
      const base = {
        inputsA: inputs,
        inputsB,
        version,
        errorCorrectionLevel,
        dataMask,
      };
      try {
        if (mode === "ambiguous") {
          const result = await generateAmbiguousViaPipeline({
            ...base,
            phaseFlip,
          });
          if (signal.aborted) return;
          setResultState({
            result,
            matrixA: result.matrixA,
            matrixB: result.matrixB,
            errorA: result.errorA,
            errorB: result.errorB,
            invalidReasonA: result.invalidReasonA,
            invalidReasonB: result.invalidReasonB,
            stats: result.stats,
            phaseFlip: result.phaseFlip,
            version: result.version,
            dataMask: result.dataMask,
            fusedImage: null,
            modulePixel: 3,
            centerSeed: 0,
          });
        } else {
          const result = await generateEmbedViaPipeline({
            ...base,
            centerSeed,
            polarityStrength,
            modulePixel,
            csf: { strength: csfStrength, ...options.csf },
          });
          if (signal.aborted) return;
          setResultState({
            result,
            matrixA: result.matrixA,
            matrixB: result.matrixB,
            errorA: result.errorA,
            errorB: result.errorB,
            invalidReasonA: result.invalidReasonA,
            invalidReasonB: result.invalidReasonB,
            stats: null,
            phaseFlip: false,
            version: result.version,
            dataMask: result.dataMask,
            fusedImage: result.fusedImage,
            modulePixel: result.modulePixel,
            centerSeed: result.centerSeed,
          });
        }
      } catch (err) {
        if (err instanceof JobCancelledError || signal.aborted) return;
        setGenerationError(
          err instanceof Error ? err.message : "Dual payload generation failed"
        );
      } finally {
        if (!signal.aborted) setIsGenerating(false);
      }
    }, 50);

    return () => {
      scheduler.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depsKey captures options
  }, [depsKey]);

  return {
    ...resultState,
    isGenerating,
    generationError,
  };
}
