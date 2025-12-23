import { QRModule, QRMatrix } from "@/domain/shared/types";

/**
 * Pattern names for QR code structural elements
 */
export const PATTERN_NAMES = {
  FinderPattern: "Finder Pattern",
  TimingPattern: "Timing Pattern",
  AlignmentPattern: "Alignment Pattern",
  Separator: "Separator",
  FormatInfo: "Format Information",
  "dark module": "Dark Module",
  VersionInfo: "Version Information",
} as const;

export type PatternName = keyof typeof PATTERN_NAMES;

/**
 * Checks if a module is part of a structural pattern (non-data module)
 */
export function isPatternModule(module: QRModule | null | undefined): boolean {
  return !!(module?.nonData && module?.source?.name);
}

/**
 * Gets the display name for a pattern module
 */
export function getPatternName(module: QRModule | null | undefined): string | null {
  if (!isPatternModule(module)) return null;
  const sourceName = module.source?.name;
  if (!sourceName) return null;
  return PATTERN_NAMES[sourceName as PatternName] || sourceName;
}

/**
 * Gets all modules in the same pattern as the given module.
 * For patterns like FinderPattern, this includes only modules in the same specific pattern instance.
 * For patterns like TimingPattern, this includes all modules with the same source.name.
 */
export function getPatternModules(
  matrix: QRMatrix | null,
  module: QRModule | null | undefined
): QRModule[] {
  if (!matrix || !module || !isPatternModule(module)) {
    return [];
  }

  const source = module.source;
  if (!source) return [];

  const patternModules: QRModule[] = [];
  const dimension = matrix.length;
  const sourceName = source.name;

  // Handle different pattern types
  if (sourceName === "FinderPattern") {
    // Finder patterns: identify which specific finder pattern (top-left, top-right, bottom-left)
    // Each is 7x7 modules
    const finderSize = 7;
    let patternStartX = -1;
    let patternStartY = -1;

    // Determine which finder pattern this module belongs to
    if (module.x < finderSize && module.y < finderSize) {
      // Top-left finder pattern
      patternStartX = 0;
      patternStartY = 0;
    } else if (module.x >= dimension - finderSize && module.y < finderSize) {
      // Top-right finder pattern
      patternStartX = dimension - finderSize;
      patternStartY = 0;
    } else if (module.x < finderSize && module.y >= dimension - finderSize) {
      // Bottom-left finder pattern
      patternStartX = 0;
      patternStartY = dimension - finderSize;
    }

    if (patternStartX >= 0 && patternStartY >= 0) {
      // Collect modules in this specific finder pattern
      for (let y = patternStartY; y < patternStartY + finderSize; y++) {
        for (let x = patternStartX; x < patternStartX + finderSize; x++) {
          const m = matrix[y]?.[x];
          if (m && m.nonData && m.source?.name === "FinderPattern") {
            patternModules.push(m);
          }
        }
      }
    }
  } else if (sourceName === "AlignmentPattern") {
    // Alignment patterns: identify which specific alignment pattern
    // Each is 5x5 modules, centered at specific positions
    // Since alignment patterns don't overlap and are spaced apart,
    // we can collect all modules within 2 modules distance (the radius of a 5x5 pattern)
    for (let y = Math.max(0, module.y - 2); y <= Math.min(dimension - 1, module.y + 2); y++) {
      for (let x = Math.max(0, module.x - 2); x <= Math.min(dimension - 1, module.x + 2); x++) {
        const m = matrix[y]?.[x];
        if (m && m.nonData && m.source?.name === "AlignmentPattern") {
          patternModules.push(m);
        }
      }
    }
  } else {
    // For other patterns (TimingPattern, FormatInfo, Separator, etc.), match by source.name
    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const m = matrix[y]?.[x];
        if (m && m.nonData && m.source?.name === sourceName) {
          patternModules.push(m);
        }
      }
    }
  }

  return patternModules;
}

/**
 * Gets bit IDs for all modules in a pattern
 */
export function getPatternBitIds(
  matrix: QRMatrix | null,
  module: QRModule | null | undefined
): string[] {
  const patternModules = getPatternModules(matrix, module);
  return patternModules
    .map((m) => m.bit?.id || m.bitId)
    .filter((id): id is string => !!id);
}

