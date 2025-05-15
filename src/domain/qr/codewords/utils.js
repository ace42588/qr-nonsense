import { getBits } from "./bits";

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

export function getECCodeword(byte, source) {
  //console.debug("getEcCodewords", {byte, sourceCodeword});
  const id = getId();
  return {
    type: "errorCorrection",
    source,
    id,
    bits: getBits(byte, CODEWORD_LENGTH, { id }),
  };
}

function getBitsFromSegments(segments) {
  return segments.flatMap((s) => {
    const bits = getBits(s.value, s.length, s);
    s.bitIds = bits.map((b) => b.id);
    return bits;
  });
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