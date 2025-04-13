import { PAD_BYTES, EC_INFO } from "./Constants";
import { ReedSolomonEncoder } from "./reedsolomon/index.js";
import { TaggedBit, TaggedCodeword, ECCodeword } from "./Tagged";

const codewordLength = 8;

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
    const capacityBits = capacityBytes * codewordLength;
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
    let remaining = codewordLength - (bits.length % codewordLength);
    if (0 < remaining < codewordLength) {
      bitStr = "".padStart(remaining, "0");
    }
    return BitUtils.createTaggedBits(bitStr, "fill", null, null);
  },
  getPaddingBits(bits, requiredDataCodewords) {
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
  },

  /**
   * Creates an array of bits that represent the modules of a QR code.
   * @param {Object[]} data - The encoded sections of data.
   * @param {number} version - The QR code version.
   * @param {number} errorCorrectionLevel - Error Correction Level.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  getFinalizedBits(dataBits, version, errorCorrectionLevel) {
    const requiredDataCodewords = QRUtils.getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    // Add terminator bits, based on version capacity
    let bits = [
      ...dataBits,
      ...QRUtils.getTerminatorBits(bits, requiredDataCodewords),
    ];
    // Pad the last codeword with 0s until its 8 bits
    bits = [
      ...bits,
      ...QRUtils.getCodewordFillBits(bits, requiredDataCodewords),
    ];
    // Add padding bytes, until the version capacity is full
    bits = [...bits, ...QRUtils.getPaddingBits(bits, requiredDataCodewords)];

    return bits;
  },
  getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
    // Try each version until one is found that fits the data.
    for (let version = 1; version <= 40; version++) {
      const { capacity } = QRUtils.gerVersionInfo(
        errorCorrectionLevel,
        version
      );

      // A terminator of up to 4 bits can be added.
      // ...but is calculated based on the capacity. This is unneeded.
      const terminatorLength = QRUtils.getTerminatorLength(
        capacity,
        totalDataBits
      );
      const totalBitsWithTerminator = totalDataBits + terminatorLength;

      // The total bits must be rounded up to the next whole 8-bit codeword.
      const requiredBytes = Math.ceil(totalBitsWithTerminator / codewordLength);

      if (requiredBytes <= capacity) {
        return version;
      }
    }
    throw new Error("Data too large to fit in a QR code version 40.");
  },
  getBlocks(chunks, errorCorrectionLevel, version) {
    let chunkBits = chunks.flatMap(({ header, segments }) => {
      const segmentBits = segments.flatMap((s) => [...s]);
      return [...header, ...segmentBits];
    });
    console.debug({ chunkBits });

    if (version === "auto") {
      version = QRUtils.getMinimumQRCodeVersion(
        chunkBits.length,
        errorCorrectionLevel
      );
    }

    const { ecCodewordsPerBlock, ecBlocks } = QRUtils.gerVersionInfo(
      errorCorrectionLevel,
      version
    );
    const rsEncoder = new ReedSolomonEncoder(ecCodewordsPerBlock);

    const dataBits = QRUtils.getFinalizedBits(
      chunkBits,
      version,
      errorCorrectionLevel
    );
    let readIdx = 0;
    let blocks = [];

    ecBlocks.forEach(({ numBlocks, dataCodewordsPerBlock }) => {
      Array.from({ length: numBlocks }, (_, i) => {
        const dataCodewords = Array.from(
          { length: dataCodewordsPerBlock },
          (_, j) => {
            new TaggedCodeword(
              dataBits.slice(
                j * codewordLength,
                j * codewordLength + codewordLength
              ),
              j
            );
          }
        );
        const ecCodewords = Array.from(
          rsEncoder.encode(
            Uint8Array.from(dataCodewords, (c) => c.byte),
            (b, idx) => new ECCodeword(b, idx)
          )
        );

        blocks = [
          ...blocks,
          {
            codewords: [...dataCodewords, ...ecCodewords],
            id: i,
          },
        ];
      });
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
