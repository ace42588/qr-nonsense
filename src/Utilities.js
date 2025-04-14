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

function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
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
  getBitsFromChunks(chunks) {
    console.debug({chunks});
    return chunks.flatMap((chunk) => {
      const { header, segments } = chunk;
      const segmentBits = segments.flatMap((segment) => [...segment]);
      return [...header, ...segmentBits];
    });
  },
  getOrderedBits(chunks, version, errorCorrectionLevel) {
    const qrBlocks = BlockUtils.getBlocks(
      chunks,
      errorCorrectionLevel,
      version
    );
    const totalCodewords = qrBlocks.reduce(
      (total, { codewords }) => total + codewords.length,
      0
    );
    return Array.from({ length: totalCodewords }, (_, idx) => {
      const blockIdx = idx % qrBlocks.length;
      const cwIdx = Math.floor(idx / qrBlocks.length);
      const { codewords } = qrBlocks[blockIdx];
      if (cwIdx < codewords.length) {
        const { bits } = codewords[cwIdx];
        return [...bits];
      }
    });
  },
  getVersion(data, inputVersion, errorCorrectionLevel) {
    let version = parseInt(inputVersion) || -1;
    if (1 <= version && version <= 40) {
      return version;
    } else if (version == -1) {
      const numBits = data.length;
      if (!numBits)
        throw new Error(
          `Cannot calculate required verson from ${JSON.stringify(data)}`
        );
      return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
    }
    throw new Error(`Invalid version: ${inputVersion.toString()}`);
  },
};

function getDataCodewordsForBlock(codewordsPerBlock, dataBits, blockId) {
  //console.debug({ codewordsPerBlock, dataBits, blockId });
  return Array.from({ length: codewordsPerBlock }, (_, i) => {
    const codwordBits = dataBits.slice(
      i * codewordLength,
      i * codewordLength + codewordLength
    );
    return new TaggedCodeword(codwordBits, i, blockId);
  });
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId) {
  //console.debug({ ecCodewordsPerBlock, dataCodewords, blockId });
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const ecBytes = Uint8Array.from(dataCodewords, (c, i) => c.byte);
  return Array.from(ecBytes, (b, idx) => new ECCodeword(b, idx, blockId));
}

function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits,
  blockId
) {
  const dataCodewords = getDataCodewordsForBlock(
    dataCodewordsPerBlock,
    dataBits,
    blockId
  );

  return {
    codewords: [
      ...dataCodewords,
      ...getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId),
    ],
    blockId,
  };
}

const BlockUtils = {
  getBlocks(chunks, errorCorrectionLevel, version) {
    const chunkBits = QRUtils.getBitsFromChunks(chunks);
    //console.debug({ chunkBits });

    version = QRUtils.getVersion(chunkBits, version, errorCorrectionLevel);

    const dataBits = getFinalizedBits(chunkBits, version, errorCorrectionLevel);

    const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
      errorCorrectionLevel,
      version
    );

    return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }) =>
      Array.from({ length: numBlocks }, (_, i) =>
        getCodewordsForBlock(
          dataCodewordsPerBlock,
          ecCodewordsPerBlock,
          dataBits,
          i
        )
      )
    );
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

export function makeModule({ taggedBit, x, y, masked }) {
  const { value, source } = taggedBit;
  return {
    ...taggedBit,
    x,
    y,
    isMasked: masked,
    isHighlighted: false,
  };
}
