import {
  cciVersionClass,
  getCharCountIndicatorLength,
  updateCharCountIndicatorLengths,
} from "../charCount";
import { encodeAlphanumeric, isAlphanumericChar } from "./alphanumeric";
import { encodeByte } from "./byte";
import { encodeKanji } from "./kanji";
import { encodeNumeric } from "./numeric";
import { unicodeToKanjiShiftJis } from "./shiftJis";
import { encodeUtf8Bytes } from "./textBytes";
import { getNumBits } from "./utils";
import type { Segment } from "@/domain/shared/types";

export type MixedMode = "numeric" | "alphanumeric" | "byte" | "kanji";

export interface MixedSegment {
  mode: MixedMode;
  data: string;
}

const MIXED_MODES: MixedMode[] = ["numeric", "alphanumeric", "byte", "kanji"];

interface CharInfo {
  char: string;
  numeric: boolean;
  alphanumeric: boolean;
  kanji: boolean;
  utf8Bytes: number;
}

function isNumericChar(char: string): boolean {
  return char >= "0" && char <= "9";
}

function classifyChar(char: string): CharInfo {
  const cp = char.codePointAt(0) ?? 0;
  return {
    char,
    numeric: isNumericChar(char),
    alphanumeric: isAlphanumericChar(char),
    kanji: unicodeToKanjiShiftJis(cp) != null,
    utf8Bytes: encodeUtf8Bytes(char).length,
  };
}

function canEncode(info: CharInfo, mode: MixedMode): boolean {
  switch (mode) {
    case "numeric":
      return info.numeric;
    case "alphanumeric":
      return info.alphanumeric;
    case "byte":
      return true;
    case "kanji":
      return info.kanji;
  }
}

function headerBits(mode: MixedMode, version: number): number {
  return 4 + getCharCountIndicatorLength(mode, version);
}

function firstCharDataBits(info: CharInfo, mode: MixedMode): number {
  switch (mode) {
    case "numeric":
      return 4;
    case "alphanumeric":
      return 6;
    case "byte":
      return 8 * info.utf8Bytes;
    case "kanji":
      return 13;
  }
}

function extraCharDataBits(
  info: CharInfo,
  mode: MixedMode,
  countBefore: number
): number {
  switch (mode) {
    case "numeric":
      return countBefore % 3 === 0 ? 4 : 3;
    case "alphanumeric":
      return countBefore % 2 === 0 ? 6 : 5;
    case "byte":
      return 8 * info.utf8Bytes;
    case "kanji":
      return 13;
  }
}

function encodePart(
  mode: MixedMode,
  data: string,
  byteEncoding: string
): Segment[] {
  switch (mode) {
    case "numeric":
      return encodeNumeric(data);
    case "alphanumeric":
      return encodeAlphanumeric(data);
    case "byte":
      return encodeByte(data, byteEncoding);
    case "kanji":
      return encodeKanji(data);
  }
}

/**
 * Choose a mode sequence that minimizes QR bitstream length for `text`.
 * Character-count indicator widths follow ISO/IEC 18004 for `version`.
 */
export function chooseMixedSegments(
  text: string,
  version = 1
): MixedSegment[] {
  if (!text) return [];

  const chars = Array.from(text).map(classifyChar);
  const n = chars.length;
  const modeCount = MIXED_MODES.length;
  const INF = Number.POSITIVE_INFINITY;
  const cciVersion = cciVersionClass(version);

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(modeCount).fill(INF)
  );
  const lastStart: number[][] = Array.from({ length: n + 1 }, () =>
    Array(modeCount).fill(0)
  );
  const prevMode: number[][] = Array.from({ length: n + 1 }, () =>
    Array(modeCount).fill(-1)
  );

  for (let i = 0; i < n; i++) {
    const info = chars[i];
    for (let m = 0; m < modeCount; m++) {
      const mode = MIXED_MODES[m];
      if (!canEncode(info, mode)) continue;

      let best = INF;
      let bestStart = i;
      let bestPrev = -1;

      const newSegCost = headerBits(mode, cciVersion) + firstCharDataBits(info, mode);
      if (i === 0) {
        best = newSegCost;
        bestStart = 0;
        bestPrev = -1;
      } else {
        for (let pm = 0; pm < modeCount; pm++) {
          if (dp[i][pm] === INF) continue;
          const cost = dp[i][pm] + newSegCost;
          if (cost < best) {
            best = cost;
            bestStart = i;
            bestPrev = pm;
          }
        }
      }

      if (i > 0 && dp[i][m] !== INF) {
        const countBefore = i - lastStart[i][m];
        const extendCost =
          dp[i][m] + extraCharDataBits(info, mode, countBefore);
        // Prefer extending on ties so we do not pay a redundant header.
        if (extendCost <= best) {
          best = extendCost;
          bestStart = lastStart[i][m];
          bestPrev = prevMode[i][m];
        }
      }

      dp[i + 1][m] = best;
      lastStart[i + 1][m] = bestStart;
      prevMode[i + 1][m] = bestPrev;
    }
  }

  let bestMode = 0;
  for (let m = 1; m < modeCount; m++) {
    if (dp[n][m] < dp[n][bestMode]) bestMode = m;
  }

  const parts: MixedSegment[] = [];
  let i = n;
  let m = bestMode;
  while (i > 0 && m >= 0) {
    const start = lastStart[i][m];
    parts.push({
      mode: MIXED_MODES[m],
      data: chars.slice(start, i).map((c) => c.char).join(""),
    });
    const pm = prevMode[i][m];
    i = start;
    m = pm;
  }
  parts.reverse();
  return parts;
}

function resolveMixedByteEncoding(encoding: unknown): string {
  if (encoding == null || encoding === "") return "utf-8";
  if (typeof encoding === "object") {
    return resolveMixedByteEncoding(
      (encoding as { encoding?: unknown }).encoding
    );
  }
  const raw = String(encoding).trim().toLowerCase();
  if (
    raw === "hex" ||
    raw === "utf8" ||
    raw === "[object object]" ||
    /^\d+$/.test(raw)
  ) {
    return "utf-8";
  }
  return raw;
}

function encodeSegments(
  parts: MixedSegment[],
  byteEncoding: string
): Segment[] {
  return parts.flatMap((part) => encodePart(part.mode, part.data, byteEncoding));
}

function bitLengthAtVersion(segments: Segment[], version: number): number {
  return getNumBits(updateCharCountIndicatorLengths(segments, version));
}

/**
 * Encode `text` as the shortest mix of numeric, alphanumeric, byte, and kanji.
 * Falls back to a single byte segment when mixed mode is not shorter.
 */
export function encodeMixed(
  text: string,
  options: { version?: number; encoding?: unknown } = {}
): Segment[] {
  const data = text ?? "";
  if (!data) return [];

  const version = options.version ?? 1;
  const encoding = resolveMixedByteEncoding(options.encoding);

  const byteOnly = encodeByte(data, encoding);
  const parts = chooseMixedSegments(data, version);
  const mixed = encodeSegments(parts, encoding);

  if (
    mixed.length === 0 ||
    bitLengthAtVersion(mixed, version) >= bitLengthAtVersion(byteOnly, version)
  ) {
    return byteOnly;
  }
  return mixed;
}
