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
  getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  if (!qrCapacityBytes[errorCorrectionLevel]) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }

  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    let capacityBytes = qrCapacityBytes[errorCorrectionLevel][version];
    let capacityBits = capacityBytes * 8;

    // A terminator of up to 4 bits can be added.
    const terminatorBits = Math.min(
      4,
      Math.max(0, capacityBits - totalDataBits)
    );
    const totalBitsWithTerminator = totalDataBits + terminatorBits;

    // The total bits must be rounded up to the next whole 8-bit codeword.
    const requiredBytes = Math.ceil(totalBitsWithTerminator / 8);

    if (requiredBytes <= capacityBytes) {
      return version;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
}
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
