import { PAD_BYTES, EC_INFO } from "./Constants";
import { ReedSolomonEncoder } from "./reedsolomon/index.js";
import { TaggedBit, TaggedCodeword, ECCodeword } from "./Tagged";

const codewordLength = 8;

const paddingBytes = PAD_BYTES.map((byte) => {
  return byte.map((bit) => new TaggedBit(bit));
});

function getCodewordFillBits(bits, requiredDataCodewords) {
  let bitStr;
  let remaining = codewordLength - (bits.length % codewordLength);
  if (0 < remaining < codewordLength) {
    bitStr = "".padStart(remaining, "0");
  }
  return BitUtils.createTaggedBits(bitStr, "fill", null, null);
}

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

function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
}

function getTerminatorBits(bits, requiredDataCodewords) {
  let length = getTerminatorLength(requiredDataCodewords, bits);
  const bitStr = "".padStart(length, "0");
  return BitUtils.createTaggedBits(bitStr, "terminator", null, null);
}

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * codewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}

function gerVersionInfo(errorCorrectionLevel, version) {
  const versions = EC_INFO[errorCorrectionLevel];
  if (!EC_INFO[errorCorrectionLevel]) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }
  const versionInfo = versions[version];
  if (!versionInfo) {
    throw new Error("Invalid QR version: " + version);
  }
  return versionInfo;
}

export const QRUtils = {
  /**
   * Creates an array of bits that represent the modules of a QR code.
   * @param {Object[]} data - The encoded sections of data.
   * @param {number} version - The QR code version.
   * @param {number} errorCorrectionLevel - Error Correction Level.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  getFinalizedBits(dataBits, version, errorCorrectionLevel) {
    const requiredDataCodewords = getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    // Add terminator bits, based on version capacity
    let bits = [...dataBits, ...getTerminatorBits(bits, requiredDataCodewords)];
    // Pad the last codeword with 0s until its 8 bits
    bits = [...bits, ...getCodewordFillBits(bits, requiredDataCodewords)];
    // Add padding bytes, until the version capacity is full
    bits = [...bits, ...getPaddingBits(bits, requiredDataCodewords)];

    return bits;
  },
  getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
    // Try each version until one is found that fits the data.
    for (let version = 1; version <= 40; version++) {
      const { capacity } = gerVersionInfo(errorCorrectionLevel, version);
      // A terminator of up to 4 bits can be added.
      // ...but is calculated based on the capacity. This is unneeded.
      //const terminatorLength = getTerminatorLength(capacity, totalDataBits);
      //const totalBitsWithTerminator = totalDataBits + terminatorLength;

      // The total bits must be rounded up to the next whole 8-bit codeword.
      const requiredBytes = Math.ceil(totalDataBits / codewordLength);

      if (requiredBytes <= capacity) {
        return version;
      }
    }
    throw new Error("Data too large to fit in a QR code version 40.");
  },
  getOrderedBits(chunks, errorCorrectionLevel, version) {
    const qrBlocks = QRUtils.getBlocks(chunks, errorCorrectionLevel, version);
    const totalCodewords = qrBlocks.reduce(
      (total, { codewords }) => total + codewords.length,
      0
    );
    const orderedBits = Array.from({ length: totalCodewords }, (_, idx) => {
      const blockIdx = idx % qrBlocks.length;
      const cwIdx = Math.floor(idx / qrBlocks.length);
      const { codewords } = qrBlocks[blockIdx];
      if (cwIdx < codewords.length) {
        const { bits } = codewords[cwIdx];
        return [...bits];
      }
    });
    return orderedBits;
  },
};

function getBitsFromChunks(chunks, errorCorrectionLevel, version) {
    const chunkBits = chunks.flatMap(({ header, segments }) => {
      const segmentBits = segments.flatMap((s) => [...s]);
      return [...header, ...segmentBits];
    });
    console.debug({ chunkBits });
    return QRUtils.getFinalizedBits(
      chunkBits,
      version,
      errorCorrectionLevel
    );
  }
const BlockUtils = {

  getBlocks(chunks, errorCorrectionLevel, version) {
    if (version === "auto") {
      version = QRUtils.getMinimumQRCodeVersion(
        chunkBits.length,
        errorCorrectionLevel
      );
    }

    const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
      errorCorrectionLevel,
      version
    );

    const rsEncoder = new ReedSolomonEncoder(ecCodewordsPerBlock);

    getBitsFromChunks
    
    return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }) =>
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

        return {
          codewords: [...dataCodewords, ...ecCodewords],
          blockId: i,
        };
      })
    );
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
