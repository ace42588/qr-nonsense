import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { BitUtils, getBits } from "./BitUtils";
import { gerVersionInfo } from "./QRUtils";

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

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}

export function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  inputs,
  version,
  errorCorrectionLevel
) {
  //console.debug("getCodewordsForBlock", { blockId });
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const dataBits = BitUtils.getBitsFromChunks(inputs, requiredDataCodewords);
  // Add terminator bits, based on version capacity

  const fillBits = BitUtils.getCodewordFillBits(bits, requiredDataCodewords);
  // Pad the last codeword with 0s until its 8 bits
  bits = [...bits, ...fillBits];
  const padBits = BitUtils.getPaddingBits(bits, requiredDataCodewords);
  // Add padding bytes, until the version capacity is full
  bits = [...bits, ...padBits];

  const dataCodewords = getDataCodewordsForBlock(
    dataCodewordsPerBlock,
    ecCodewordsPerBlock,
    bits
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords),
  ];
}

function getDataCodewordsForBlock(
  codewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits
) {
  console.debug({ codewordsPerBlock, dataBits });
  const dataCodewords = Array.from({ length: codewordsPerBlock }, (_, i) => {
    const bits = dataBits.slice(
      i * CodewordLength,
      i * CodewordLength + CodewordLength
    );
    return getCodeword(bits, "Data");
  });
  //console.debug("getDataCodewordsForBlock", { dataCodewords });
  return dataCodewords;
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords) {
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
