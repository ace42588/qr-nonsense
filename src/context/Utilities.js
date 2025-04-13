import { VERSIONS, PAD_BYTES } from "./Constants";
import { TaggedBit } from "../encode/TaggedBit";

export const QRUtils = {
  computeRequiredDataCodewords(version, errorCorrectionLevel) {
    const { errorCorrectionLevels } = VERSIONS[version - 1];
    const { ecCodewordsPerBlock, ecBlocks } =
      errorCorrectionLevels[errorCorrectionLevel];

    return ecBlocks.reduce(
      (t, { numBlocks, dataCodewordsPerBlock }) =>
        t + numBlocks * dataCodewordsPerBlock,
      0
    );
  },
  addTerminatorBits(bits, requiredDataCodewords) {
    let bitStr;
    let requiredBits = requiredDataCodewords * 8;
    let remaining = requiredBits - bits.length;
    // add terminator if there is space
    if (0 < remaining <= 4) {
      bitStr = "".padStart(remaining, "0");
    }
    const termBits = BitUtils.createTaggedBits(
      bitStr,
      "terminator",
      null,
      null
    );
    return [...bits, ...termBits];
  },
  fillCodeword(bits, requiredDataCodewords) {
    let bitStr;
    let remaining = 8 - (bits.length % 8);
    if (0 < remaining < 8) {
      bitStr = "".padStart(remaining, "0");
    }
    const fillBits = BitUtils.createTaggedBits(bitStr, "fill", null, null);
    return [...bits, ...fillBits];
  },
  addPadding(bits, requiredDataCodewords) {
    const currentCodewords = bits.length / 8;
    const codewordsNeeded = requiredDataCodewords - currentCodewords;
    let padded = [...bits];
    for (let i = 0; i < codewordsNeeded; i++) {
      padded = [...padded, ...PAD_BYTES[i % 2]];
    }
    return padded;
  },
  
  /**
   * Creates an array of bits that represent the modules of a QR code.
   * @param {Object[]} data - The encoded sections of data.
   * @param {number} version - The QR code version.
   * @param {number} errorCorrectionLevel - Error Correction Level.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  finalizeBitStream(data, version, errorCorrectionLevel) {
    const sectionBits = data.map(({ header, segments }, dIdx) => {
      const segmentBits = segments.flatMap((s, sIdx) => [...s]);
      return [...header, ...segmentBits];
    });

    const requiredDataCodewords = QRUtils.computeRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    const terminated = QRUtils.addTerminatorBits(
      [...sectionBits.flat()],
      requiredDataCodewords
    );
    const filled = QRUtils.fillCodeword(terminated, requiredDataCodewords);
    const padded = QRUtils.addPadding(filled, requiredDataCodewords);

    return padded;
  },
};

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
};
