import { PAD_BYTES, CodewordLength } from "../Constants";
import { TaggedBit } from "../Tagged";

let lastBitId = 0;

// ~24k bits possible
function getId() {
  if (lastBitId >= 0xffff) lastBitId = 0;

  return lastBitId++;
}

// ~24k bits possible
export function getBits(value, length) {
  if (value && length) {
    value = BitUtils.toPaddedBinary(value, length);
  }
  switch (typeof value) {
    case "string": {
      const re = /[01]{2,}/gm;
      if (!re.test(value))
        throw new Error(
          `Invalid string value for getBits(): ${JSON.stringify(value)}`
        );
      return [...value].map((bit, idx) => ({
        bit: parseInt(bit),
        id: getId(),
      }));
    }
    case "number": {
      if (value < 0 || value > 255)
        throw new Error(
          `Invalid byte value for getBits(): ${value.toString()}`
        );
      return Array.from({ length: 8 }).map((_, idx) => ({
        bit: (value >> (7 - idx)) & 1,
        id: getId(),
      }));
    }
    default: {
      throw new Error(`Invalid value for getBits(): ${JSON.stringify(value)}`);
    }
  }
}

export const BitUtils = {
  /**
   * Creates string of bits given a value and length
   * @param {number} value - The value to convert and pad.
   * @param {number} length - The desired string length.
   * @returns {string} String of binary.
   */
  toPaddedBinary(value, length) {
    return value.toString(2).padStart(length, "0");
  },

  getBitsFromChunks(chunks, requiredDataCodewords) {
    //console.debug("getBitsFromChunks", { chunks });
    const chunkBits = chunks.flatMap(({bits}) => bits);
    // Add terminator bits, based on version capacity
    const terminatorLength = getTerminatorLength(requiredDataCodewords, chunkBits);
    const termBits = getBits(0, length);
    const bits = [...chunkBits, ...termBits];
    //console.debug("getBitsFromChunks", { bits });
    return bits;
  },
};


function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}
