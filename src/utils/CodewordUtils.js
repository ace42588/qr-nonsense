import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { BitUtils, getBits } from "./BitUtils";
import { gerVersionInfo } from "./QRUtils"

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

export function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
}

export function getCodewordsForBlock(
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
