import { QRMatrix, QRModule } from "../../shared/types";
import {
  collectByPattern,
  collectFinderCorner,
  FinderCorner,
  getModuleKey,
} from "./moduleIndex";

export type RandomFilter = "all" | "data" | "structural";

function moduleIds(modules: QRModule[]): string[] {
  return modules.map(getModuleKey);
}

export function damageFinderCorner(
  matrix: QRMatrix,
  corner: FinderCorner
): string[] {
  return moduleIds(collectFinderCorner(matrix, corner));
}

export function corruptFormatInfo(matrix: QRMatrix): string[] {
  return moduleIds(collectByPattern(matrix, "FormatInfo"));
}

export function damageTiming(matrix: QRMatrix): string[] {
  return moduleIds(collectByPattern(matrix, "TimingPattern"));
}

export function damageAlignment(matrix: QRMatrix): string[] {
  return moduleIds(collectByPattern(matrix, "AlignmentPattern"));
}

function matchesFilter(module: QRModule, filter: RandomFilter): boolean {
  if (filter === "all") return true;
  if (filter === "data") return !module.nonData;
  return !!module.nonData;
}

/**
 * Pick up to n random module ids. Uses Math.random (unseeded MVP).
 */
export function randomModules(
  matrix: QRMatrix,
  n: number,
  options: { filter?: RandomFilter } = {}
): string[] {
  const filter = options.filter ?? "all";
  const candidates: string[] = [];

  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (!m) continue;
      if (!matchesFilter(m, filter)) continue;
      candidates.push(m.id);
    }
  }

  // Fisher–Yates partial shuffle
  const count = Math.min(Math.max(0, n), candidates.length);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, count);
}
