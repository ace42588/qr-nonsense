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
  encodedInputs,
  version,
  errorCorrectionLevel
) {
  //console.debug("getCodewordsForBlock", { blockId });
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const dataBits = BitUtils.getBitsFromChunks(encodedInputs, requiredDataCodewords);

  const dataCodewords = getDataCodewordsForBlock(
    dataCodewordsPerBlock,
    ecCodewordsPerBlock,
    dataBits
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
  //console.debug({ codewordsPerBlock, dataBits });
  const dataCodewords = Array.from({ length: codewordsPerBlock }, (_, i) => {
    const start = i * CodewordLength;
    const end = start + CodewordLength;
    // add padding byte if we are out of data
    if (end > dataBits.length) {
      const byte = PAD_BYTES[i % 2];
      const bits = byte.toString(2).padStart(CodewordLength, 0).split("");
      return getCodeword(bits, "Padding");
    }
    const bits = dataBits.slice(start, end);
    if (bits.length === 8) {
      return getCodeword(bits, "Data");
    } else if (bits.length < 8) {
      // add fill bits to the codeword
      const length = CodewordLength - bits.length;
      const fill = Array.from({ length }).fill(0);
      return getCodeword([...bits, ...fill], "Data (filled)");
    }
    throw new Error("Issue creating codeword from data");
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
