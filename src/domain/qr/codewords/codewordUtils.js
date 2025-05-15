import { ReedSolomonEncoder } from "../reedsolomon/";
import { getBits } from "./bitUtils";

const CodewordLength = 8;

function getId() {
  return `${crypto.randomUUID()}`;
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
    bits: getBits(byte, CodewordLength, { id }),
  };
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = Array.from(dataCodewords, ({ bits }) =>
    bits.reduce((byte, { value }, idx) => (byte << 1) | value, 0)
  );
  const ecBytes = encoder.encode(dataBytes);
  return Array.from(ecBytes, (b, idx) => getECCodeword(b, dataCodewords[idx]));
}

export function getCodewordsForBlock(
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
      console.error("Issue creating codeword from data", {cwStart, bits, encodedData});
      throw new Error("Issue creating codeword from data");
    }
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords),
  ];
}
