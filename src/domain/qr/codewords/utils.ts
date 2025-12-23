import { getBits } from "./bits";
import { Bit, Codeword, Segment, Source } from "../../shared/types";
import { generateId } from "../utils/id";

const CODEWORD_LENGTH = 8;

export function getCodeword(bits: Bit[], type: "data" | "errorCorrection"): Codeword {
  if (!bits || bits.length !== CODEWORD_LENGTH)
    throw new Error(`Invalid bits for getCodeword(): ${bits}`);
  return {
    type: type,
    id: generateId(),
    bits,
  };
}

export function getECCodeword(byte: number, source: Source): Codeword {
  const id = generateId();
  return {
    type: "errorCorrection",
    source,
    id,
    bits: getBits(byte, CODEWORD_LENGTH, { id }),
  };
}

/**
 * Creates bits from segments and mutates segments to store bitIds.
 * 
 * CRITICAL: This function mutates the segments array by setting s.bitIds.
 * The bitIds are used for highlighting modules on the canvas.
 * 
 * IMPORTANT: The bits returned from this function are the SAME objects
 * that go into codewords and eventually the matrix. This ensures that
 * segment.bitIds match the bit.id values in matrix modules.
 */
function getBitsFromSegments(segments: Segment[]): Bit[] {
  return segments.flatMap((s) => {
    const bits = getBits(s.value, s.length, s);
    // Mutate segment to store bitIds - these must match the bits used in codewords/matrix
    s.bitIds = bits.map((b) => b.id);
    return bits;
  });
}

/**
 * Creates codewords from segments.
 * 
 * CRITICAL: This function calls getBitsFromSegments which mutates segments
 * to add bitIds. The bits returned are used to create codewords, and those
 * same bit objects eventually end up in the matrix modules.
 * 
 * IMPORTANT: The segment.bitIds set here MUST match the bit.id values
 * in the matrix modules for highlighting to work correctly.
 */
export function getCodewordsFromSegments(segments: Segment[]): Codeword[] {
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

export function interleave<T>(blocks: T[][]): T[] {
  const maxLength = Math.max(...blocks.map((cw) => cw.length));
  const result: T[] = [];
  for (let i = 0; i < maxLength; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  return result;
} 