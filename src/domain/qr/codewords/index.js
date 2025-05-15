import { getBlocks } from "./blocks";
import { gerVersionInfo } from "../versionUtils";
import { getCodewordsFromSegments } from "./utils";

export function generateCodewords(segments, version, errorCorrectionLevel) {

  //const encodedBits = getBitsFromSegments(segments);
  const dataCodewords = getCodewordsFromSegments(segments);
  
  const { ecCodewordsPerBlock, ecBlocks, remainderBits } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = getBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
  
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