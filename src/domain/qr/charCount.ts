import { Segment } from "../shared/types";

/**
 * ISO/IEC 18004 character-count indicator bit width.
 * Length depends only on mode and version, not on the character count itself.
 */
export function getCharCountIndicatorLength(mode: string, version: number): number {
  switch (mode) {
    case "numeric":
      if (version < 10) return 10;
      if (version < 27) return 12;
      return 14;
    case "alphanumeric":
      if (version < 10) return 9;
      if (version < 27) return 11;
      return 13;
    case "byte":
      if (version < 10) return 8;
      return 16;
    case "kanji":
      if (version < 10) return 8;
      if (version < 27) return 10;
      return 12;
    default:
      return 16;
  }
}

/**
 * Representative version for the CCI width class of `version`
 * (1–9, 10–26, 27–40).
 */
export function cciVersionClass(version: number): number {
  if (version < 10) return 1;
  if (version < 27) return 10;
  return 27;
}

function modeFromIndicatorBits(value: number): string | null {
  if (value === 0x1) return "numeric";
  if (value === 0x2) return "alphanumeric";
  if (value === 0x4) return "byte";
  if (value === 0x8) return "kanji";
  return null;
}

/**
 * Update character count indicator segments to use version-correct length.
 */
export function updateCharCountIndicatorLengths(
  segments: Segment[],
  version: number
): Segment[] {
  return segments.map((segment, segmentIndex) => {
    if (segment.type !== "characterCountIndicator") {
      return segment;
    }
    if (segmentIndex > 0) {
      const modeIndicator = segments[segmentIndex - 1];
      if (modeIndicator.type === "modeIndicator") {
        const mode = modeFromIndicatorBits(modeIndicator.value);
        if (!mode) return segment; // ECI and unknown modes have no CCI to fix up

        const correctLength = getCharCountIndicatorLength(mode, version);
        if (segment.length !== correctLength) {
          return { ...segment, length: correctLength };
        }
      }
    }
    return segment;
  });
}
