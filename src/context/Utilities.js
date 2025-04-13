import { TaggedBit } from "./TaggedBit";

export const BitUtils = {
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
  createTaggedBits(bitStr, type, source, mode) {
    return [...bitStr].map(
      (bit, idx) =>
        new TaggedBit({
          bit,
          type,
          source,
          idx,
          mode,
        })
    );
  },
};