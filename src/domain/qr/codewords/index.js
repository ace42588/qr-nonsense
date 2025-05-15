import { getBitsFromSegments } from "./bits";
import { getBlocks } from "./blocks";
import { gerVersionInfo } from "../versionUtils";

export function generateCodewords(segments, version, errorCorrectionLevel) {

  const encodedBits = getBitsFromSegments(segments);
  
  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = getBlocks(encodedBits, ecCodewordsPerBlock, ecBlocks);
  
  const length = qrBlocks.reduce(
    (total, { codewords }) => total + codewords.length,
    0
  );
  return Array.from({ length }, (_, idx) => {
    const blockIdx = idx % qrBlocks.length;
    const cwIdx = Math.floor(idx / qrBlocks.length);
    const { codewords: bCodewords } = qrBlocks[blockIdx];
    if (cwIdx < bCodewords.length) {
      return bCodewords[cwIdx];
    }
  });
}

export const getCodewords = generateCodewords;