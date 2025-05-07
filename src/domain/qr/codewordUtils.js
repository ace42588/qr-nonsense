import { ReedSolomonEncoder } from "./reedsolomon/";
import { getBits } from "./bitUtils";
import { gerVersionInfo } from "./versionUtils";

const CodewordLength = 8;

let lastCodewordId = 0;

function getId() {
  if (lastCodewordId >= 0xffff) lastCodewordId = 0;

  return `codeword-${lastCodewordId++}`;
}

function getCodeword(bits, type) {
  if (!bits || bits.length !== CodewordLength)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    type: "codeword",
    subtype: type,
    id: getId(),
    bits,
  };
}

function getECCodeword(byte, sourceCodeword) {
  //console.debug("getEcCodewords", {byte, sourceCodeword});
  const id = getId();
  return {
    type: "codeword",
    subtype: "errorCorrection",
    sourceCodeword,
    id,
    bits: getBits(byte, CodewordLength, {id}),
  };
}

function getBlocks(encodedData, errorCorrectionLevel, version) {
  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
  let lastBlockId = 0;
  let numProcessedCodewords = 0;

  // ecBlocks is an { numBlocks, dataCodewordsPerBlock }[] used to map
  // the specifics of how to split up codewords for error correction.
  // The capacity of a block can vary within a QR code version.

  return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }, idx) => {
    const blocksForType = Array.from(
      { length: numBlocks },
      (_, blockNumber) => {
        const blockId = lastBlockId + blockNumber;
        const blockCodewords = getCodewordsForBlock(
          dataCodewordsPerBlock,
          ecCodewordsPerBlock,
          numProcessedCodewords,
          encodedData
        );
        numProcessedCodewords += dataCodewordsPerBlock;
        return {
          codewords: blockCodewords,
          id: blockId,
        };
      }
    );
    lastBlockId = lastBlockId + blocksForType.length;
    return blocksForType;
  });
}

export function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
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
      const cwStart = numProcessedCodewords + i * CodewordLength;
      const bits = encodedData.slice(cwStart, cwStart + CodewordLength);
      if (bits.length === 8) {
        return getCodeword(bits, "data");
      }
      throw new Error("Issue creating codeword from data");
    }
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords),
  ];
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = Array.from(dataCodewords, ({ bits }) =>
    bits.reduce((byte, { value }, idx) => (byte << 1) | value, 0)
  );
  const ecBytes = encoder.encode(dataBytes);
  return Array.from(ecBytes, (b, idx) => getECCodeword(b, dataCodewords[idx]));
}

export function getCodewords(encodedInputs, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const qrBlocks = getBlocks(encodedInputs, errorCorrectionLevel, version);
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
