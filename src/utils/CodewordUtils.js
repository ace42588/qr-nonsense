import { PAD_BYTES, DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
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
   numProcessedCodewords,
  encodedInputs,
  version,
  errorCorrectionLevel
) {
  //console.debug("getCodewordsForBlock", { encodedInputs });
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  let bits = encodedInputs.flatMap(({ bits }) => bits);
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits);
  bits = [...bits, ...termBits];
  //console.debug("getCodewordsForBlock", { termBits, bits });
  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits);
  bits = [...bits, ...fillBits];
  //console.debug("getCodewordsForBlock", { remainder, numFillBits, fillBits, bits });
  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) => {
    const byte = PAD_BYTES[i % 2];
    return getBits(byte, 8);
  });
  //console.debug("getCodewordsForBlock", { padBytes, bits });
  bits = [...bits, ...padBytes.flat()];

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
  console.debug("getDataCodewordsForBlock", { codewordsPerBlock, dataBits });
  const dataCodewords = Array.from({ length: codewordsPerBlock }, (_, i) => {
    const start = i * CodewordLength;
    const end = start + CodewordLength;
    const bits = dataBits.slice(start, end);
    if (bits.length === 8) {
      return getCodeword(bits, "Data");
    }
    throw new Error("Issue creating codeword from data");
  });
  console.debug("getDataCodewordsForBlock", { dataCodewords });
  return dataCodewords;
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = Array.from(dataCodewords, ({ bits }) =>
    bits.reduce((num, { value }, idx) => num | (value << idx), 0)
  );
  console.debug("getEcCodewords", { dataBytes });
  const ecBytes = encoder.encode(dataBytes);
  console.debug("getEcCodewords", { ecBytes });
  return Array.from(ecBytes, (b, idx) => {
    //return new ECCodeword(b, eccId, blockId);
    return getCodeword(getBits(b, 8), "Error Correction");
  });
}
