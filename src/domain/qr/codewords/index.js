import { getBitsFromSegments } from "./bitUtils";
import { getBlocks } from "./blockUtils";

export function generateCodewords(segments, version, errorCorrectionLevel) {

  const encodedBits = getBitsFromSegments(segments);

  const qrBlocks = getBlocks(encodedBits, errorCorrectionLevel, version);
  
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