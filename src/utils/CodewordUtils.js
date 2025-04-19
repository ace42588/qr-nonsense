import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { BitUtils, getBits } from "./BitUtils";

let lastCodewordId = 0;

function getId() {
  if (lastCodewordId >= 0xffff) lastCodewordId = 0;

  return lastCodewordId++;
}

function getCodeword(bits, type) {
  //console.debug("getCodeword", { bits, type });
  if (!bits || bits.length !== 8)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    id: getId(),
    type,
    bits,
    bitIds: bits.map(({ id }) => id),
  };
}

function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
}

function getFinalizedBits(dataBits, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const termBits = BitUtils.getTerminatorBits(dataBits, requiredDataCodewords);
  // Add terminator bits, based on version capacity
  let bits = [...dataBits, ...termBits];
  const fillBits = BitUtils.getCodewordFillBits(bits, requiredDataCodewords);
  // Pad the last codeword with 0s until its 8 bits
  bits = [...bits, ...fillBits];
  const padBits = BitUtils.getPaddingBits(bits, requiredDataCodewords);
  // Add padding bytes, until the version capacity is full
  bits = [...bits, ...padBits];

  return bits;
}

function getBlocks(chunks, errorCorrectionLevel, version) {
  const chunkBits = BitUtils.getBitsFromChunks(chunks);
  //console.debug({ chunkBits });

  //version = QRUtils.getVersion(chunkBits, version, errorCorrectionLevel);

  const dataBits = getFinalizedBits(chunkBits, version, errorCorrectionLevel);

  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
  let lastBlockId = 0;
  let lastCodewordId = 0;

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
          dataBits,
          blockId,
          lastCodewordId
        );
        lastCodewordId = lastCodewordId + blockCodewords.length;
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

function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits,
  blockId,
  firstCodewordId
) {
  //console.debug("getCodewordsForBlock", { blockId });
  const dataCodewords = getDataCodewordsForBlock(
    dataCodewordsPerBlock,
    ecCodewordsPerBlock,
    dataBits,
    blockId,
    firstCodewordId
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId),
  ];
}

function getDataCodewordsForBlock(
  codewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits,
  blockId,
  firstCodewordId
) {
  //console.debug({ codewordsPerBlock, dataBits, blockId });
  const dataCodewords = Array.from({ length: codewordsPerBlock }, (_, i) => {
    const bits = dataBits.slice(
      i * CodewordLength,
      i * CodewordLength + CodewordLength
    );
    //return new TaggedCodeword(bits, firstCodewordId + i, blockId);
    return getCodeword(bits, "Data");
  });
  //console.debug("getDataCodewordsForBlock", { dataCodewords });
  return dataCodewords;
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = Array.from(dataCodewords, ({ bits }) =>
    bits.reduce((num, { bit }, idx) => num | (bit << idx), 0)
  );
  //console.debug("getEcCodewords", { dataBytes });
  const ecBytes = encoder.encode(dataBytes);
  //console.debug("getEcCodewords", { ecBytes });
  return Array.from(ecBytes, (b, idx) => {
    //return new ECCodeword(b, eccId, blockId);
    return getCodeword(getBits(b), "Error Correction");
  });
}
