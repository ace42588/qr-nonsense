import { getBits, getBitsFromSegments } from "./bits";

const CODEWORD_LENGTH = 8;

function getId() {
  return `${crypto.randomUUID()}`;
}

export function getCodeword(bits, type) {
  if (!bits || bits.length !== CODEWORD_LENGTH)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    type: type,
    id: getId(),
    bits,
  };
}

export function getECCodeword(byte, sourceCodeword) {
  //console.debug("getEcCodewords", {byte, sourceCodeword});
  const id = getId();
  return {
    type: "errorCorrection",
    sourceCodeword,
    id,
    bits: getBits(byte, CODEWORD_LENGTH, { id }),
  };
}

export function getCodewordsFromSegments(segments) {
  const encodedData = getBitsFromSegments(segments);
  if (encodedData.length % CODEWORD_LENGTH !== 0)
    throw new Error(
      "Encoded data cannot be broken up into codewords! Check terminator, fill, etc."
    );

  return Array.from(
    { length: encodedData.length / CODEWORD_LENGTH },
    (_, i) => {
      const start = i * CODEWORD_LENGTH;
      const bits = encodedData.slice(start, start + CODEWORD_LENGTH);
      return getCodeword(bits, "data");
    }
  );
}