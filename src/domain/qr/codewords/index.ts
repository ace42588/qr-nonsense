import { getBlocks } from "./blocks.ts";
import { gerVersionInfo } from "../versionUtils.ts";
import { getCodewordsFromSegments, interleave } from "./utils.ts";
import { Codeword, Segment } from "@/types/index.ts";

export function generateCodewords(
  segments: Segment[],
  version: number,
  errorCorrectionLevel: number
): Codeword[] {
  const dataCodewords = getCodewordsFromSegments(segments);

  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = getBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
  
  return [
    ...interleave(qrBlocks.map((b) => b.data)),
    ...interleave(qrBlocks.map((b) => b.errorCorrection))
  ];
}

export const getCodewords = generateCodewords; 