import type { QRMatrix } from "@/domain/shared/types";
import { encodePair, type EncodePairOptions, type EncodePairResult } from "@/domain/dual";

export interface AmbiguousOptions extends EncodePairOptions {
  /** When true, B occupies the main diagonal of the 2×2 checker. */
  phaseFlip?: boolean;
}

export interface AmbiguousStats {
  agreeCount: number;
  disagreeCount: number;
  totalModules: number;
}

export interface AmbiguousResult extends EncodePairResult {
  stats: AmbiguousStats;
  phaseFlip: boolean;
}

export function countAgreement(matrixA: QRMatrix, matrixB: QRMatrix): AmbiguousStats {
  const dimension = matrixA.length;
  let agreeCount = 0;
  let disagreeCount = 0;
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const a = !!matrixA[y]?.[x]?.isDark;
      const b = !!matrixB[y]?.[x]?.isDark;
      if (a === b) agreeCount++;
      else disagreeCount++;
    }
  }
  return {
    agreeCount,
    disagreeCount,
    totalModules: agreeCount + disagreeCount,
  };
}

export function generateAmbiguous(options: AmbiguousOptions): AmbiguousResult {
  const phaseFlip = Boolean(options.phaseFlip);
  const pair = encodePair(options);
  const stats =
    pair.matrixA && pair.matrixB
      ? countAgreement(pair.matrixA, pair.matrixB)
      : { agreeCount: 0, disagreeCount: 0, totalModules: 0 };
  return { ...pair, stats, phaseFlip };
}
