// src/domain/qr/codewords/blocks.js
import { ReedSolomonEncoder } from "../reedsolomon/";
import { gerVersionInfo } from "../versionUtils";
import { getCodeword, getECCodeword } from "./utils";
import { bitsToByte } from "./bits";

const CODEWORD_LENGTH = 8;

function splitIntoDataCodewords(encodedData) {
  if (encodedData.length % CODEWORD_LENGTH !== 0) throw new Error("Encoded data cannot be broken up into codewords! Check terminator, fill, etc.");

  return Array.from({ length: encodedData.length / CODEWORD_LENGTH }, (_, i) => {
    const start = i * CODEWORD_LENGTH;
    const bits = encodedData.slice(start, start + CODEWORD_LENGTH);
    if (bits.length !== CODEWORD_LENGTH) {
      throw new Error(`Incomplete codeword at index ${i}: ${bits.length} bits`);
    }
    return getCodeword(bits, "data");
  });
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = dataCodewords.map(({ bits }) => bitsToByte(bits));
  const ecBytes = encoder.encode(dataBytes);
  //return ecBytes.map((b, idx) => getECCodeword(b, dataCodewords[idx]));
  return Array.from(ecBytes, (b, idx) => getECCodeword(b, dataCodewords[idx]));
}

function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  numProcessedCodewords,
  encodedData
) {
  const dataCodewords = Array.from(
    { length: dataCodewordsPerBlock },
    (_, i) => {
      const cwStart = numProcessedCodewords + i * CODEWORD_LENGTH;
      const bits = encodedData.slice(cwStart, cwStart + CODEWORD_LENGTH);
      if (bits.length === 8) {
        return getCodeword(bits, "data");
      }
      console.error("Issue creating codeword from data", {
        cwStart,
        bits,
        encodedData,
      });
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

  return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }, idx) => 
    Array.from({ length: numBlocks }, (_, blockNumber) => {
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
    })
  );
}
