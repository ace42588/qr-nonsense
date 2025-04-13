import { PAD_BYTES, EC_INFO } from "./Constants";
import { TaggedBit } from "../encode/TaggedBit";

const versions = [{ label: "Auto", value: "auto" }].concat(
  Array.from({ length: 40 }, (_, i) => ({
    label: `Version ${i + 1}`,
    value: i + 1,
  }))
);

const paddingBytes = PAD_BYTES.map((byte) => {
  return byte.map((bit) => new TaggedBit(bit));
});

export const QRUtils = {
  getVersionsByECLevel(errorCorrectionLevel) {
    const versions = EC_INFO[errorCorrectionLevel];
    if (!EC_INFO[errorCorrectionLevel]) {
      throw new Error(
        "Invalid error correction level: " + errorCorrectionLevel
      );
    }
    return versions;
  },
  gerVersionInfo(errorCorrectionLevel, version) {
    const versions = QRUtils.getVersionsByECLevel(errorCorrectionLevel);
    const versionInfo = versions[version];
    if (!versionInfo) {
      throw new Error("Invalid QR version: " + version);
    }
    return versionInfo;
  },
  getTerminatorLength(capacityBytes, totalDataBits) {
    const capacityBits = capacityBytes * 8;
    return Math.min(4, Math.max(0, capacityBits - totalDataBits));
  },
  getRequiredDataCodewords(version, errorCorrectionLevel) {
    const { ecBlocks } = QRUtils.gerVersionInfo(errorCorrectionLevel, version);
    let requiredDataCodewords = 0;

    return ecBlocks.reduce(
      (total, { numBlocks, dataCodewordsPerBlock }) =>
        total + numBlocks * dataCodewordsPerBlock,
      requiredDataCodewords
    );
  },
  getTerminatorBits(bits, requiredDataCodewords) {
    let length = QRUtils.getTerminatorLength(requiredDataCodewords, bits);
    const bitStr = "".padStart(length, "0");
    return BitUtils.createTaggedBits(bitStr, "terminator", null, null);
  },
  getCodewordFillBits(bits, requiredDataCodewords) {
    let bitStr;
    let remaining = 8 - (bits.length % 8);
    if (0 < remaining < 8) {
      bitStr = "".padStart(remaining, "0");
    }
    return BitUtils.createTaggedBits(bitStr, "fill", null, null);
  },
  getPaddingBits(bits, requiredDataCodewords) {
    const length = bits.length;
    if (length % 8 !== 0)
      throw new Error(`Bits (length: ${length}) aren't codeword/byte aligned!`);
    const currentCodewords = length / 8;
    const codewordsNeeded = requiredDataCodewords - currentCodewords;
    let padding = [];
    for (let i = 0; i < codewordsNeeded; i++) {
      const paddingByte = paddingBytes[i % 2];
      padding = [...padding, ...paddingBytes[i % 2]];
    }
    return padding;
  },

  /**
   * Creates an array of bits that represent the modules of a QR code.
   * @param {Object[]} data - The encoded sections of data.
   * @param {number} version - The QR code version.
   * @param {number} errorCorrectionLevel - Error Correction Level.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  getFinalizedBits(data, version, errorCorrectionLevel) {
    let bits = data.flatMap(({ header, segments }) => {
      const segmentBits = segments.flatMap((s) => [...s]);
      return [...header, ...segmentBits];
    });
    console.debug({ bits });

    if (version === "auto") {
      version = QRUtils.getMinimumQRCodeVersion(
        bits.length,
        errorCorrectionLevel
      );
    }

    const requiredDataCodewords = QRUtils.getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );

    bits = [...bits, ...QRUtils.getTerminatorBits(bits, requiredDataCodewords)];
    bits = [
      ...bits,
      ...QRUtils.getCodewordFillBits(bits, requiredDataCodewords),
    ];
    bits = [...bits, ...QRUtils.getPaddingBits(bits, requiredDataCodewords)];

    return bits;
  },
  getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
    // Try each version until one is found that fits the data.
    for (let version = 1; version <= 40; version++) {
      const { capacity } = QRUtils.gerVersionInfo(errorCorrectionLevel, version);

      // A terminator of up to 4 bits can be added.
      // ...but is calculated based on the capacity. This is unneeded.
      const terminatorLength = QRUtils.getTerminatorLength(
        capacity,
        totalDataBits
      );
      const totalBitsWithTerminator = totalDataBits + terminatorLength;

      // The total bits must be rounded up to the next whole 8-bit codeword.
      const requiredBytes = Math.ceil(totalBitsWithTerminator / 8);

      if (requiredBytes <= capacity) {
        return version;
      }
    }
    throw new Error("Data too large to fit in a QR code version 40.");
  },
  getBlocks(data, errorCorrectionLevel, version) {
    const { ecCodewordsPerBlock, ecBlocks } = QRUtils.gerVersionInfo(errorCorrectionLevel, version);

    const dataBits = QRUtils.getFinalizedBits(version, errorCorrectionLevel);
  let readIdx = 0;


    ecBlocks.forEach(({ numBlocks, dataCodewordsPerBlock }) => {
      for (let i = 0; i < numBlocks; i++) {
        const block = new Block(dataCodewordsPerBlock, ecCodewordsPerBlock, i);
        const { dataCodewords, numDataCodewords } = block;
        while (dataCodewords.length < numDataCodewords) {
          const start = readIdx;
          readIdx += 8;
          const taggedBits = dataBits.slice(start, readIdx);
          const codeword = new TaggedCodeword(taggedBits, dataCodewords.length);
          dataCodewords.push(codeword);
        }
        block.generateErrorCorrection();
        blocks.push(block);
      }
    });
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
