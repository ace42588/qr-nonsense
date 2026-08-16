import { useMemo } from "react";
import { useInputs } from "@/state/inputs/InputContext";
import { generateAmbiguous, type AmbiguousResult } from "@/domain/ambiguous";
import { generateEmbed, type EmbedResult } from "@/domain/embed";
import type { CsfOptions } from "@/domain/isqr/csf";

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

  return useMemo(() => {
    const base = {
      inputsA: inputs,
      inputsB,
      version,
      errorCorrectionLevel,
      dataMask,
    };

    if (mode === "ambiguous") {
      const result: AmbiguousResult = generateAmbiguous({ ...base, phaseFlip });
      return {
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
        fusedImage: null as ImageData | null,
        modulePixel: 3,
        centerSeed: 0,
      };
    }

    const result: EmbedResult = generateEmbed({
      ...base,
      centerSeed,
      polarityStrength,
      modulePixel,
      csf: { strength: csfStrength, ...options.csf },
    });
    return {
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
    };
  }, [
    mode,
    inputs,
    inputsB,
    version,
    errorCorrectionLevel,
    dataMask,
    phaseFlip,
    centerSeed,
    polarityStrength,
    csfStrength,
    modulePixel,
    options.csf,
  ]);
}
