import { PAD_BYTES, EC_INFO } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { TaggedBit, TaggedCodeword, ECCodeword } from "../Tagged";

const codewordLength = 8;

function getPaddingBits(bits, requiredDataCodewords) {
  const length = bits.length;
  if (length % codewordLength !== 0)
    throw new Error(`Bits (length: ${length}) aren't codeword/byte aligned!`);
  const currentCodewords = length / codewordLength;
  const codewordsNeeded = requiredDataCodewords - currentCodewords;
  let padding = [];
  for (let i = 0; i < codewordsNeeded; i++) {
    const paddingByte = paddingBytes[i % 2];
    padding = [...padding, ...paddingBytes[i % 2]];
  }
  return padding;
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
};

const paddingBytes = PAD_BYTES.map((byte) => {
  //console.debug("paddingBytes", { byte });
  const bits = byte.toString(2);
  return BitUtils.createTaggedBits(bits, "padding", byte, null);
});

function getCodewordFillBits(bits, requiredDataCodewords) {
  let bitStr;
  let remaining = codewordLength - (bits.length % codewordLength);
  if (0 < remaining < codewordLength) {
    bitStr = "".padStart(remaining, "0");
  }
  return BitUtils.createTaggedBits(bitStr, "fill", null, null);
}

/**
 * Creates an array of bits that represent the modules of a QR code.
 * @param {Object[]} data - The encoded sections of data.
 * @param {number} version - The QR code version.
 * @param {number} errorCorrectionLevel - Error Correction Level.
 * @returns {TaggedBit[]} Array of TaggedBit instances.
 */
function getFinalizedBits(dataBits, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  // Add terminator bits, based on version capacity
  let bits = [
    ...dataBits,
    ...getTerminatorBits(dataBits, requiredDataCodewords),
  ];
  // Pad the last codeword with 0s until its 8 bits
  bits = [...bits, ...getCodewordFillBits(bits, requiredDataCodewords)];
  // Add padding bytes, until the version capacity is full
  bits = [...bits, ...getPaddingBits(bits, requiredDataCodewords)];

  return bits;
}

function getTerminatorBits(bits, requiredDataCodewords) {
  let length = getTerminatorLength(requiredDataCodewords, bits);
  const bitStr = "".padStart(length, "0");
  return BitUtils.createTaggedBits(bitStr, "terminator", null, null);
}