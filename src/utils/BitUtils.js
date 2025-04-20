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

  /**
   * Creates an array of TaggedBit instances from a string of bits.
   * @param {string} bits - The binary string.
   * @param {string} type - Type of the bit.
   * @param {*} source - Source identifier.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  createTaggedBits(bitStr, sourceType, sourceValue, mode) {
    //console.debug("createTaggedBits", { bitStr, sourceType, sourceValue, mode });
    return [...bitStr].map((bit, idx) => {
      const taggedBit = new TaggedBit({
        bit,
        type: sourceType,
        source: sourceValue,
        id: idx,
        mode,
      });
      if (mode && typeof mode === "object") {
        taggedBit.mode = mode.name;
      }
      return taggedBit;
    });
  },

  getBitsFromChunks(chunks, requiredDataCodewords) {
    //console.debug("getBitsFromChunks", { chunks });
    const chunkBits = chunks.flatMap((chunk, idx) => {
      //console.debug("getBitsFromChunks", { chunk });
      const { mode, characterCount, segments } = chunk;
      const modeBits = getBits(mode.value, mode.length);
      const charCountBits = getBits(characterCount.value, characterCount.length);
      const segmentBits = segments.flatMap((segment) => {
        const { length, value } = segment;
        const bits = getBits(value, length);
        segment.bitIds = bits.map(({ id }) => id);
        return bits;
      });
      const bits = [...modeBits, ...charCountBits, ...segmentBits];
      return bits;
    });
    // Add terminator bits, based on version capacity
    const terminatorLength = getTerminatorLength(requiredDataCodewords, chunkBits);
    const termBits = getBits(0, length);
    const bits = [...chunkBits, ...termBits];
    console.debug("getBitsFromChunks", { bits });
    return bits;
  },
  getCodewordFillBits(bits, requiredDataCodewords) {
    let bitStr;
    let remaining = CodewordLength - (bits.length % CodewordLength);
    if (0 < remaining < CodewordLength) {
      bitStr = "".padStart(remaining, "0");
    }
    return BitUtils.createTaggedBits(bitStr, "fill", null, null);
  },
  getPaddingBits(bits, requiredDataCodewords) {
    const length = bits.length;
    if (length % CodewordLength !== 0)
      throw new Error(`Bits (length: ${length}) aren't codeword/byte aligned!`);
    const currentCodewords = length / CodewordLength;
    const codewordsNeeded = requiredDataCodewords - currentCodewords;
    let padding = [];
    for (let i = 0; i < codewordsNeeded; i++) {
      const paddingByte = paddingBytes[i % 2];
      padding = [...padding, ...paddingBytes[i % 2]];
    }
    return padding;
  },
};

const paddingBytes = PAD_BYTES.map((byte) => {
  //console.debug("paddingBytes", { byte });
  const bits = byte.toString(2);
  return BitUtils.createTaggedBits(bits, "padding", byte, null);
});

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}
