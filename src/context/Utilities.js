import { VERSIONS, PAD_BYTES } from "./Constants";
import { TaggedBit } from "./TaggedBit";

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

  /**
   * Creates an array of bits that represent the modules of a QR code.
   * @param {Object[]} data - The encoded sections of data.
   * @param {number} version - The QR code version.
   * @param {number} errorCorrectionLevel - Source identifier.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  finalizeBitStream(data, version, errorCorrectionLevel) {
    const bits = data.flatMap(({ header, segments }, dIdx) => {
      const segmentBits = segments.flatMap((s, sIdx) => [...s]);
      return [...header, ...segmentBits];
    });
    const { errorCorrectionLevels } = VERSIONS[version - 1];
    const { ecCodewordsPerBlock, ecBlocks } =
      errorCorrectionLevels[errorCorrectionLevel];

    const requiredDataCodewords = ecBlocks.reduce(
      (t, { numBlocks, dataCodewordsPerBlock }) =>
        t + numBlocks * dataCodewordsPerBlock,
      0
    );
    let finalBits = [...bits];
    let bitStr;
    let requiredBits = requiredDataCodewords * 8;
    let remaining = requiredBits - bits.length;
    // add terminator if there is space
    if (0 < remaining <= 4) {
      bitStr = "".padStart(remaining, "0");
    }
    const termBits = [...bitStr].map(
      (bit) =>
        new TaggedBit({
          bit,
          type: "terminator",
          source: "terminator",
        })
    );
    finalBits = [...finalBits, ...termBits];
    // bits needed to fill the codeword
    remaining = 8 - (finalBits.length % 8);
    if (0 < remaining < 8) {
      bitStr = "".padStart(remaining, "0");
    }
    const fillBits = [...bitStr].map(
      (bit) =>
        new TaggedBit({
          bit,
          type: "terminator",
          source: "fill",
        })
    );
    finalBits = [...finalBits, ...fillBits];
    const currentCodewords = finalBits.length / 8;
    const codewordsNeeded = requiredDataCodewords - currentCodewords;
    for (let i = 0; i < codewordsNeeded; i++) {
      finalBits = [...finalBits, ...PAD_BYTES[i % 2]];
    }

    return finalBits;
  },
};
