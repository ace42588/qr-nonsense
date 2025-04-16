import { PAD_BYTES, EC_INFO, CodewordLength } from "./Constants";
import { ReedSolomonEncoder } from "./reedsolomon/index.js";
import { TaggedBit, TaggedCodeword, ECCodeword } from "./Tagged";
import { BitUtils } from "./BitUtils";

function getBlocks(chunks, errorCorrectionLevel, version) {
  const chunkBits = BitUtils.getBitsFromChunks(chunks);
  //console.debug({ chunkBits });

  version = QRUtils.getVersion(chunkBits, version, errorCorrectionLevel);

  const dataBits = BitUtils.getFinalizedBits(
    chunkBits,
    version,
    errorCorrectionLevel
  );

  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
  let lastBlockId = 0;
  let lastCodewordId = 0;

  // ecBlocks is an { numBlocks, dataCodewordsPerBlock }[] used to map
  // the specifics of how to split up codewords for error correction.
  // The capacity of a block can vary within a QR code version.

  return ecBlocks.flatMap(({ numBlocks, dataCodewordsPerBlock }, idx) => {
    const blocksForType = Array.from(
      { length: numBlocks },
      (_, blockNumber) => {
        const blockId = lastBlockId + blockNumber;
        const blockCodewords = getCodewordsForBlock(
          dataCodewordsPerBlock,
          ecCodewordsPerBlock,
          dataBits,
          blockId,
          lastCodewordId
        );
        lastCodewordId = lastCodewordId + blockCodewords.length;
        return {
          codewords: blockCodewords,
          id: blockId,
        };
      }
    );
    lastBlockId = lastBlockId + blocksForType.length;
    return blocksForType;
  });
}

function getCodewordsForBlock(
  dataCodewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits,
  blockId,
  firstCodewordId
) {
  //console.debug("getCodewordsForBlock", { blockId });
  const dataCodewords = getDataCodewordsForBlock(
    dataCodewordsPerBlock,
    ecCodewordsPerBlock,
    dataBits,
    blockId,
    firstCodewordId
  );

  return [
    ...dataCodewords,
    ...getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId),
  ];
}

function getDataCodewordsForBlock(
  codewordsPerBlock,
  ecCodewordsPerBlock,
  dataBits,
  blockId,
  firstCodewordId
) {
  //console.debug({ codewordsPerBlock, dataBits, blockId });
  const dataCodewords = Array.from({ length: codewordsPerBlock }, (_, i) => {
    const codewordBits = dataBits.slice(
      i * CodewordLength,
      i * CodewordLength + CodewordLength
    );
    return new TaggedCodeword(codewordBits, firstCodewordId + i, blockId);
  });
  //console.debug("getDataCodewordsForBlock", { dataCodewords });
  return dataCodewords;
}

function getEcCodewords(ecCodewordsPerBlock, dataCodewords, blockId) {
  const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
  const dataBytes = Array.from(dataCodewords, (c) => c.byteValue);
  //console.debug("getEcCodewords", { dataBytes });
  const ecBytes = encoder.encode(dataBytes);
  //console.debug("getEcCodewords", { ecBytes });
  return Array.from(ecBytes, (b, idx) => {
    const eccId = idx + dataCodewords.length;
    return new ECCodeword(b, eccId, blockId);
  });
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
    const requiredBytes = Math.ceil(totalDataBits / CodewordLength);

    if (requiredBytes <= capacity) {
      return version;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
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
  getOrderedBits(chunks, version, errorCorrectionLevel) {
    const qrBlocks = getBlocks(
      chunks,
      errorCorrectionLevel,
      version
    );
    const totalCodewords = qrBlocks.reduce(
      (total, { codewords }) => total + codewords.length,
      0
    );
    const codewords = Array.from({ length: totalCodewords }, (_, idx) => {
      const blockIdx = idx % qrBlocks.length;
      const cwIdx = Math.floor(idx / qrBlocks.length);
      const { codewords } = qrBlocks[blockIdx];
      if (cwIdx < codewords.length) {
        const { bits } = codewords[cwIdx];
        return [...bits];
      }
    });
    return codewords.flat();
  },
  getCodewords(chunks, version, errorCorrectionLevel) {
    const qrBlocks = getBlocks(
      chunks,
      errorCorrectionLevel,
      version
    );
    //console.debug("getCodewords", { qrBlocks });
    const totalCodewords = qrBlocks.reduce(
      (total, { codewords }) => total + codewords.length,
      0
    );
    const orderedCodewords = Array.from(
      { length: totalCodewords },
      (_, idx) => {
        const blockIdx = idx % qrBlocks.length;
        const cwIdx = Math.floor(idx / qrBlocks.length);
        const { codewords: bCodewords } = qrBlocks[blockIdx];
        if (cwIdx < bCodewords.length) {
          const codeword = bCodewords[cwIdx];
          codeword.qrPosition = idx;
          return codeword;
        }
      }
    );
    return orderedCodewords;
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
