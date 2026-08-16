/**
 * ISO/IEC 18004 mask penalty scoring with N1–N4 breakdown.
 * Rule 3 counts 1:1:3:1:1 finder-like patterns with 4-light separators.
 */

import type { QRMatrix } from "@/domain/shared/types";
import type { MaskPenaltyBreakdown } from "./types";

function isDarkAt(matrix: QRMatrix, x: number, y: number): boolean {
  return !!matrix[y]?.[x]?.isDark;
}

/** Rule 1: consecutive same-color runs of length ≥ 5 */
function scoreN1(matrix: QRMatrix): number {
  const size = matrix.length;
  let score = 0;

  for (let y = 0; y < size; y++) {
    let runColor: boolean | null = null;
    let runLength = 0;
    for (let x = 0; x < size; x++) {
      const value = isDarkAt(matrix, x, y);
      if (value === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = value;
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  for (let x = 0; x < size; x++) {
    let runColor: boolean | null = null;
    let runLength = 0;
    for (let y = 0; y < size; y++) {
      const value = isDarkAt(matrix, x, y);
      if (value === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = value;
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  return score;
}

/** Rule 2: 2×2 blocks of the same color */
function scoreN2(matrix: QRMatrix): number {
  const size = matrix.length;
  let score = 0;
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = isDarkAt(matrix, x, y);
      if (
        v === isDarkAt(matrix, x + 1, y) &&
        v === isDarkAt(matrix, x, y + 1) &&
        v === isDarkAt(matrix, x + 1, y + 1)
      ) {
        score += 3;
      }
    }
  }
  return score;
}

/**
 * Rule 3: finder-like 1:1:3:1:1 with four light modules on either side.
 * Pattern dark/light bits: 1 0 1 1 1 0 1 with 0000 before or after.
 * Each match adds 40.
 */
function scoreN3(matrix: QRMatrix): number {
  const size = matrix.length;
  let score = 0;

  const checkLine = (get: (i: number) => boolean) => {
    // Convert to 0/1 for clarity: dark=1
    const bits = new Array<number>(size);
    for (let i = 0; i < size; i++) bits[i] = get(i) ? 1 : 0;

    for (let i = 0; i <= size - 7; i++) {
      if (
        bits[i] === 1 &&
        bits[i + 1] === 0 &&
        bits[i + 2] === 1 &&
        bits[i + 3] === 1 &&
        bits[i + 4] === 1 &&
        bits[i + 5] === 0 &&
        bits[i + 6] === 1
      ) {
        const before =
          i >= 4 &&
          bits[i - 1] === 0 &&
          bits[i - 2] === 0 &&
          bits[i - 3] === 0 &&
          bits[i - 4] === 0;
        const after =
          i + 10 < size &&
          bits[i + 7] === 0 &&
          bits[i + 8] === 0 &&
          bits[i + 9] === 0 &&
          bits[i + 10] === 0;
        if (before || after) {
          score += 40;
        }
      }
    }
  };

  for (let y = 0; y < size; y++) {
    checkLine((x) => isDarkAt(matrix, x, y));
  }
  for (let x = 0; x < size; x++) {
    checkLine((y) => isDarkAt(matrix, x, y));
  }

  return score;
}

/** Rule 4: dark/light balance in 5% steps from 50% */
function scoreN4(matrix: QRMatrix): number {
  const size = matrix.length;
  const totalModules = size * size;
  let darkCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isDarkAt(matrix, x, y)) darkCount++;
    }
  }
  const percent = (darkCount / totalModules) * 100;
  const fivePercentSteps = Math.abs(Math.round(percent / 5) - 10);
  return fivePercentSteps * 10;
}

/** Full ISO mask penalty with N1–N4 breakdown. */
export function calculateMaskPenalty(matrix: QRMatrix): MaskPenaltyBreakdown {
  const n1 = scoreN1(matrix);
  const n2 = scoreN2(matrix);
  const n3 = scoreN3(matrix);
  const n4 = scoreN4(matrix);
  return { n1, n2, n3, n4, total: n1 + n2 + n3 + n4 };
}

/** Compatibility alias used by matrix auto-mask selection. */
export function calculatePenalty(matrix: QRMatrix): number {
  return calculateMaskPenalty(matrix).total;
}
