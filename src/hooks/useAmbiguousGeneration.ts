import { useDualMatrices } from "./useDualMatrices";

export function useAmbiguousGeneration(phaseFlip = false) {
  return useDualMatrices("ambiguous", { phaseFlip });
}
