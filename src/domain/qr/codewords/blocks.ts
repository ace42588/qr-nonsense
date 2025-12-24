import { ReedSolomonEncoder } from "../reedsolomon";
import { getECCodeword } from "./utils";
import { bitsToByte } from "./bits";
import { Codeword, ECBlock, Source } from "../../shared/types";
import { generateId } from "../utils/id";

export interface QRBlock {
  data: Codeword[];
  errorCorrection: Codeword[];
}

interface CodewordSource extends Source {
  block: number;
  index: number;
}

function generateEcCodewords(
  ecCodewordsPerBlock: number,
  dataCodewords: Codeword[],
  blockIndex: number
): Codeword[] {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = dataCodewords.map(({ bits }) => bitsToByte(bits));
  const ecBytes = encoder.encode(new Uint8ClampedArray(dataBytes));

  return Array.from(ecBytes, ((byte: number, idx: number) => {
    const source: CodewordSource = {
      id: generateId(),
      block: blockIndex,
      index: idx, // index within the EC section of the block
    };
    return getECCodeword(byte, source);
  }));
}

export function generateBlocks(
  dataCodewords: Codeword[],
  ecCodewordsPerBlock: number,
  ecBlocks: ECBlock[]
): QRBlock[] {
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

      return {
        data: blockData,
        errorCorrection: ecCodewords
      };
    })
  );
} 