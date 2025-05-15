import { gerVersionInfo } from "../versionUtils";
import { getCodeword, getEcCodewords } from "./utils";

const CodewordLength = 8;

function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  numProcessedCodewords,
  encodedData
) {
  const dataCodewords = Array.from(
    { length: dataCodewordsPerBlock },
    (_, i) => {
      const cwStart = numProcessedCodewords + i * CodewordLength;
      const bits = encodedData.slice(cwStart, cwStart + CodewordLength);
      if (bits.length === 8) {
        return getCodeword(bits, "data");
      }
      console.error("Issue creating codeword from data", {cwStart, bits, encodedData});
      throw new Error("Issue creating codeword from data");
    }
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords),
  ];
}

export function getBlocks(encodedData, ecCodewordsPerBlock, ecBlocks) {
  let numProcessedCodewords = 0;

  // ecBlocks is an { numBlocks, dataCodewordsPerBlock }[] used to map
  // the specifics of how to split up codewords for error correction.
  // The capacity of a block can vary within a QR code version.

  return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }, idx) => {
    return Array.from(
      { length: numBlocks },
      (_, blockNumber) => {
        const blockCodewords = getCodewordsForBlock(
          dataCodewordsPerBlock,
          ecCodewordsPerBlock,
          numProcessedCodewords,
          encodedData
        );
        numProcessedCodewords += dataCodewordsPerBlock;
        return {
          codewords: blockCodewords,
        };
      }
    );
  });
}
