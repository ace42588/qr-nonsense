import { getBlocks } from "./blocks";
import { gerVersionInfo } from "../versionUtils";
import { getCodewordsFromSegments } from "./utils";

const interleave = (blocks) => {
  const maxLength = Math.max(...blocks.map((cw) => cw.length));
  const result = [];
  for (let i = 0; i < maxLength; i++) {
    for (const block of blocks) {
      result.push(block[i]);
    }
  }
  return result
}

export function generateCodewords(segments, version, errorCorrectionLevel) {
  //const encodedBits = getBitsFromSegments(segments);
  const dataCodewords = getCodewordsFromSegments(segments);

  const { ecCodewordsPerBlock, ecBlocks, remainderBits } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = getBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
  const numBlocks = qrBlocks.length;
  console.debug("generateCodewords", {qrBlocks});

  const length = qrBlocks.reduce(
    (total, { data, errorCorrection }) => total + data.length + errorCorrection.length,
    0
  );
  console.debug("generateCodewords", { length });
  return Array.from({ length }, (_, idx) => {
    const blockIdx = idx % numBlocks;
    const cwIdx = Math.floor(idx / numBlocks);
    const { codewords } = qrBlocks[blockIdx];
    return codewords[cwIdx];
  });
}

export const getCodewords = generateCodewords;
