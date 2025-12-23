import { generateBlocks, QRBlock } from "./blocks";
import { getVersionInfo } from "../versionUtils";
import { getCodewordsFromSegments, interleave } from "./utils";
import { Codeword, Segment } from "../../shared/types";

export interface CodewordsResult {
  codewords: Codeword[];
  blocks: QRBlock[];
}

export function generateCodewords(
  segments: Segment[],
  version: number,
  errorCorrectionLevel: number
): CodewordsResult {
  const dataCodewords = getCodewordsFromSegments(segments);

  const { ecCodewordsPerBlock, ecBlocks } = getVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = generateBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
  
  const codewords = [
    ...interleave(qrBlocks.map((b) => b.data)),
    ...interleave(qrBlocks.map((b) => b.errorCorrection))
  ];

  return {
    codewords,
    blocks: qrBlocks,
  };
} 