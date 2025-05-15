// src/domain/qr/codewords/blocks.js
import { ReedSolomonEncoder } from "../reedsolomon/";
import { gerVersionInfo } from "../versionUtils";
import { getCodeword, getECCodeword } from "./utils";
import { bitsToByte } from "./bits";

function generateEcCodewords(ecCodewordsPerBlock, dataCodewords, blockIndex) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = dataCodewords.map(({ bits }) => bitsToByte(bits));
  const ecBytes = encoder.encode(dataBytes);

  return Array.from(ecBytes, ((byte, idx) => {
    const source = {
      block: blockIndex,
      index: idx, // index within the EC section of the block
    };
    return getECCodeword(byte, source);
  }));
}

export function getBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks) {
  let offset = 0;

  // ecBlocks is an { numBlocks, dataCodewordsPerBlock }[] used to map
  // the specifics of how to split up codewords for error correction.
  // The capacity of a block can vary within a QR code version.

  return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }) =>
    Array.from({ length: numBlocks }, (_, idx) => {
      const blockData = dataCodewords.slice(
        offset,
        offset + dataCodewordsPerBlock
      );
      if (blockData.length !== dataCodewordsPerBlock) {
        throw new Error(
          `Insufficient codewords for block: expected ${dataCodewordsPerBlock}, got ${blockData.length}`
        );
      }
      offset += dataCodewordsPerBlock;

      const ecCodewords = generateEcCodewords(
        ecCodewordsPerBlock,
        blockData,
        idx
      );
      console.debug("getBlocks", { ecCodewords });

      return {
        codewords: [...blockData, ...ecCodewords],
      };
    })
  );
}
