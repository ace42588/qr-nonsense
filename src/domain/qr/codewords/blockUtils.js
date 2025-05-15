import { gerVersionInfo } from "../versionUtils";
import { getCodewordsForBlock } from "./codewordUtils";

export function getBlocks(encodedData, errorCorrectionLevel, version) {
  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
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
