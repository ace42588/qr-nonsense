import { getBits } from "./bits";

const CodewordLength = 8;

function getId() {
  return `${crypto.randomUUID()}`;
}

export function getCodeword(bits, type) {
  if (!bits || bits.length !== CodewordLength)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    type: "codeword",
    subtype: type,
    id: getId(),
    bits,
  };
}

export function getECCodeword(byte, sourceCodeword) {
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