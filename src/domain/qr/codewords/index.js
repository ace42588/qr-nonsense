import { getBitsFromSegments } from "./bitUtils";
import { getBlocks } from "./blockUtils";

export function generateCodewords(segments, version, errorCorrectionLevel) {

  const encodedBits = getBitsFromSegments(segments);

  const qrBlocks = getBlocks(encodedBits, errorCorrectionLevel, version);
  const totalCodewords = qrBlocks.reduce(
    (total, { codewords }) => total + codewords.length,
    0
  );
  const orderedCodewords = Array.from({ length: totalCodewords }, (_, idx) => {
    const blockIdx = idx % qrBlocks.length;
    const cwIdx = Math.floor(idx / qrBlocks.length);
    const { codewords: bCodewords } = qrBlocks[blockIdx];
    if (cwIdx < bCodewords.length) {
      const codeword = bCodewords[cwIdx];
      codeword.qrPosition = idx;
      return codeword;
    }
  });
  return orderedCodewords;
}
