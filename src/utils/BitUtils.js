import { PAD_BYTES, CodewordLength } from "../Constants";
import { TaggedBit } from "../Tagged";

function getBits(value, source) {
  
}

function getHeaderBits(header, chunkId) {
  
}

function getSegmentBits(segments, chunkId) {
  
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

  getBitsFromChunks(chunks) {
    //console.debug("getBitsFromChunks", { chunks });
    return chunks.flatMap((chunk, idx) => {
      const { header, segments } = chunk;
      const segmentBits = segments.flatMap((segment) => [...segment]);
      return [...header, ...segmentBits];
    });
  },
  getTerminatorBits(bits, requiredDataCodewords) {
    let length = getTerminatorLength(requiredDataCodewords, bits);
    const bitStr = "".padStart(length, "0");
    return BitUtils.createTaggedBits(bitStr, "terminator", null, null);
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
