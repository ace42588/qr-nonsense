import { useDualMatrices } from "./useDualMatrices";
import type { CsfOptions } from "@/domain/isqr/csf";

export interface EmbedGenerationOptions {
  centerSeed?: number;
  polarityStrength?: number;
  csf?: CsfOptions;
  modulePixel?: number;
}

export function useEmbedGeneration(options: EmbedGenerationOptions = {}) {
  return useDualMatrices("embed", options);
}
