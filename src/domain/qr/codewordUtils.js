import { CodewordLength } from "./Constants";
import { ReedSolomonEncoder } from "./reedsolomon/";
import { getBits } from "./bitUtils";
import { gerVersionInfo } from "./versionUtils";
import { finalizeEncoding } from "./encoders/Encoders";

let lastCodewordId = 0;

function getId() {
  if (lastCodewordId >= 0xffff) lastCodewordId = 0;

  return `codeword-${lastCodewordId++}`;
}

function getCodeword(bits, type) {
  //console.debug("getCodeword", { bits, type });
  if (!bits || bits.length !== 8)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    type: "codeword",
    id: getId(),
    type,
    bits,
    bitIds: bits.map(({ id }) => id),
  };
}

function getBlocks(encodedData, errorCorrectionLevel, version) {
  //console.debug("getBlocks", { encodedData });
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
  //console.debug("getCodewordsForBlock", { encodedData });
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
  //console.debug("getEcCodewords", { dataBytes });
  const ecBytes = encoder.encode(dataBytes);
  //console.debug("getEcCodewords", { ecBytes });
  return Array.from(ecBytes, (b) => {
    //console.debug("getEcCodewords", {b});
    return getCodeword(getBits(b, 8), "errorCorrection");
  });
}

export function getCodewords(encodedInputs, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );

  //const encodedData = finalizeEncoding(encodedInputs, requiredDataCodewords);
  //const qrBlocks = getBlocks(encodedData, errorCorrectionLevel, version);
  const qrBlocks = getBlocks(encodedInputs, errorCorrectionLevel, version);
  //console.debug("getCodewords", { qrBlocks });
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
  //console.debug("QRUtils.getCodewords", { orderedCodewords });
  return orderedCodewords;
}
