/**
 * Thin codewords/matrix stage wrappers for the generation pipeline.
 */

import type { Codeword, QRMatrix, Segment } from "../shared/types";
import type { QRBlock } from "./codewords/blocks";
import { generateCodewords } from "./codewords";
import { getMatrix } from "./matrix";
import { getEncodedMessage } from "./encodeMessage";
import { getVersionInfo, type VersionInfo } from "./versionUtils";
import type { Input } from "@/state/inputs/types";

export interface EncodeSegmentsResult {
  segments: Segment[];
  version: number;
  versionInfo: VersionInfo;
  error: string | null;
  invalid: boolean;
  invalidReason: string | null;
}

export function encodeSegments(
  inputs: Input[] | Record<string, Input>,
  version: number | string,
  errorCorrectionLevel: number
): EncodeSegmentsResult {
  const encoded = getEncodedMessage(inputs, version, errorCorrectionLevel);
  const versionInfo = getVersionInfo(errorCorrectionLevel, encoded.version);
  return {
    segments: encoded.segments,
    version: encoded.version,
    versionInfo,
    error: encoded.error ?? null,
    invalid: Boolean(encoded.invalid),
    invalidReason: encoded.invalidReason ?? null,
  };
}

export interface BuildCodewordsResult {
  codewords: Codeword[];
  blocks: QRBlock[];
  segments: Segment[];
}

/**
 * Builds codewords/blocks. Mutates segment copies to attach bitIds
 * (same contract as getCodewords / useDerivedQRData).
 */
export function buildCodewords(
  segments: Segment[],
  version: number,
  errorCorrectionLevel: number
): BuildCodewordsResult {
  const segmentsWithBitIds = segments.map((s) => ({ ...s }));
  const { codewords, blocks } = generateCodewords(
    segmentsWithBitIds,
    version,
    errorCorrectionLevel
  );
  return { codewords, blocks, segments: segmentsWithBitIds };
}

export interface BuildMatrixResult {
  matrix: QRMatrix;
  dataMask: number;
}

export function buildMatrix(
  codewords: Codeword[],
  dataMask: number | string | null | undefined,
  version: number,
  errorCorrectionLevel: number
): BuildMatrixResult {
  const mask =
    dataMask === null || dataMask === undefined ? -1 : dataMask;
  return getMatrix(codewords, mask, version, errorCorrectionLevel);
}
