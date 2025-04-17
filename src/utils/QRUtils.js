import { EC_INFO, CodewordLength } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { TaggedCodeword, ECCodeword } from "../Tagged";
import { BitUtils } from "./BitUtils";
import { FormatInfo } from "../encode/FormatInfo";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "../encode/FunctionPatterns";
import { VersionInfo } from "../encode/VersionInfo";
import { RemainderBit } from "../encode/TaggedBitstream";

function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
}

function getFinalizedBits(dataBits, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const termBits = BitUtils.getTerminatorBits(dataBits, requiredDataCodewords);
  // Add terminator bits, based on version capacity
  let bits = [...dataBits, ...termBits];
  const fillBits = BitUtils.getCodewordFillBits(bits, requiredDataCodewords);
  // Pad the last codeword with 0s until its 8 bits
  bits = [...bits, ...fillBits];
  const padBits = BitUtils.getPaddingBits(bits, requiredDataCodewords);
  // Add padding bytes, until the version capacity is full
  bits = [...bits, ...padBits];

  return bits;
}

function getBlocks(chunks, errorCorrectionLevel, version) {
  const chunkBits = BitUtils.getBitsFromChunks(chunks);
  //console.debug({ chunkBits });

  //version = QRUtils.getVersion(chunkBits, version, errorCorrectionLevel);

  const dataBits = getFinalizedBits(chunkBits, version, errorCorrectionLevel);

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
    const qrBlocks = getBlocks(chunks, errorCorrectionLevel, version);
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
    const qrBlocks = getBlocks(chunks, errorCorrectionLevel, version);
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
  getVersion(chunks, inputVersion, errorCorrectionLevel) {
    const data = BitUtils.getBitsFromChunks(chunks);
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

const DATA_MASKS = [
  (p) => (p.y + p.x) % 2 === 0,
  (p) => p.y % 2 === 0,
  (p) => p.x % 3 === 0,
  (p) => (p.y + p.x) % 3 === 0,
  (p) => (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0,
  (p) => ((p.x * p.y) % 2) + ((p.x * p.y) % 3) === 0,
  (p) => (((p.y * p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
  (p) => (((p.y + p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
];

const REMAINDER_BIT = new RemainderBit();

export function generateQRCodeMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  const dimension = version * 4 + 17;

  function createBaseMatrix() {
    const matrix = Array.from({ length: dimension }, () =>
      Array(dimension).fill(false)
    );
    FinderPattern.populate(matrix);
    TimingPattern.populate(matrix);
    new AlignmentPattern(version).populate(matrix);
    new FormatInfo({ errorCorrectionLevel, dataMask });
    new VersionInfo(version).populate(matrix);
    return matrix;
  }

  /*
  function addModules(empty) {
    const newMatrix = empty.map((row) => [...row]);
    const bits = codewords.flat();
    let bitIdx = 0;
    let up = true;
    const dimension = newMatrix.length;
    // write columns in pairs, right to left
    for (let columnIdx = dimension - 1; columnIdx > 0; columnIdx -= 2) {
      // Skip the vertical timing pattern column
      if (columnIdx === 6) columnIdx--;

      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;

        for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
          let x = columnIdx - columnOffset;

          // check for pattern
          if (!newMatrix[y][x]) {
            //console.debug({bits, bitIdx});
            let taggedBit;
            if (bitIdx < bits.length) {
              taggedBit = bits[bitIdx++];
            } else {
              taggedBit = REMAINDER_BIT;
            }

            const isMasked = DATA_MASKS[dataMask]({ x, y });
            newMatrix[y][x] = {
              ...taggedBit,
              x,
              y,
              isMasked,
              isHighlighted: false,
            };
          }
        }
      }
      up = !up; // Change direction
    }
    return newMatrix;
  }

  const empty = createEmptyMatrix();
  const matrix = addModules(empty);
*/
  function mapQRMatrix(matrix, callbackFn) {
    const newMatrix = matrix.map((row) => [...row]);
    let up = true;

    // write columns in pairs, right to left
    for (let col = dimension - 1; col > 0; col -= 2) {
      // Skip the vertical timing pattern column
      if (col === 6) col--;
      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;
        for (let offset = 0; offset < 2; offset++) {
          const x = col - offset;
          const value = newMatrix[y][x];
          // check if matrix position is used for pattern
          if (!newMatrix[y][x]) {
            newMatrix[y][x] = callbackFn({ x, y }, value);
          }
        }
      }
      up = !up;
    }
    return newMatrix;
  }

  function applyMask(matrix, maskIndex) {
    const maskFunc = DATA_MASKS[maskIndex];
    return mapQRMatrix(matrix, ({ x, y }, current) => {
      current.isMasked = maskFunc({ x, y });
      return current;
    });
  }

  function applyCodewords(matrix) {
    const bits = codewords.flat();
    let bitIdx = 0;
    return mapQRMatrix(matrix, ({ x, y }, current) => {
      const bit = bits[bitIdx++] ?? REMAINDER_BIT;
      const { isMasked } = current;
      const value = isMasked ? !bit.value : bit.value;
      return {
        ...bit,
        value,
        isMasked,
        isHighlighted: false,
        x,
        y,
      };
    });
  }

  function applyData(matrix, maskIndex) {
    const maskFunc = DATA_MASKS[maskIndex];
    const masked = matrix.map((row) => [...row]);
    const bits = codewords.flat();
    let bitIdx = 0;
    let up = true;

    // write columns in pairs, right to left
    for (let col = dimension - 1; col > 0; col -= 2) {
      // Skip the vertical timing pattern column
      if (col === 6) col--;
      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;
        for (let offset = 0; offset < 2; offset++) {
          const x = col - offset;
          // check for pattern
          if (!masked[y][x]) {
            const bit = bits[bitIdx++] ?? REMAINDER_BIT;
            const isMasked = maskFunc({ x, y });
            const value = isMasked ? !bit.value : bit.value;
            masked[y][x] = {
              ...bit,
              value,
              isMasked,
              isHighlighted: false,
              x,
              y,
            };
          }
        }
      }
      up = !up;
    }

    new FormatInfo({
      errorCorrectionLevel,
      dataMask: maskIndex,
    }).populate(masked);

    return masked;
  }

  function calculatePenalty(matrix) {
    const size = matrix.length;
    let score = 0;

    // Rule 1: same-color runs
    for (let y = 0; y < size; y++) {
      let runColor = null;
      let runLength = 0;
      for (let x = 0; x < size; x++) {
        const value = !!matrix[y][x]?.value;
        if (value === runColor) {
          runLength++;
        } else {
          if (runLength >= 5) score += 3 + (runLength - 5);
          runColor = value;
          runLength = 1;
        }
      }
      if (runLength >= 5) score += 3 + (runLength - 5);
    }

    for (let x = 0; x < size; x++) {
      let runColor = null;
      let runLength = 0;
      for (let y = 0; y < size; y++) {
        const value = !!matrix[y][x]?.value;
        if (value === runColor) {
          runLength++;
        } else {
          if (runLength >= 5) score += 3 + (runLength - 5);
          runColor = value;
          runLength = 1;
        }
      }
      if (runLength >= 5) score += 3 + (runLength - 5);
    }

    // Rule 2: 2x2 blocks
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const v = !!matrix[y][x]?.value;
        if (
          v === !!matrix[y][x + 1]?.value &&
          v === !!matrix[y + 1][x]?.value &&
          v === !!matrix[y + 1][x + 1]?.value
        ) {
          score += 3;
        }
      }
    }

    // Rule 3: finder-like patterns
    const pattern = [1, 0, 1, 1, 1, 0, 1];
    const patternStr = pattern.join("");

    const checkPattern = (arr) => arr.join("").includes(patternStr);

    for (let y = 0; y < size; y++) {
      const row = matrix[y].map((m) => (m?.value ? 1 : 0));
      if (checkPattern(row)) score += 40;
    }

    for (let x = 0; x < size; x++) {
      const col = matrix.map((row) => (row[x]?.value ? 1 : 0));
      if (checkPattern(col)) score += 40;
    }

    // Rule 4: dark/light balance
    const totalModules = size * size;
    const darkCount = matrix.flat().filter((m) => m?.value).length;
    const percent = (darkCount / totalModules) * 100;
    const fivePercentSteps = Math.abs(Math.round(percent / 5) - 10);
    score += fivePercentSteps * 10;

    return score;
  }

  const base = createBaseMatrix();
  const populated = applyCodewords(base);
  
  if (dataMask !== -1) {
    return applyMask(populated, dataMask);
  }

  // Automatic mask scoring
  let bestMatrix = null;
  let bestScore = Infinity;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const testMatrix = applyMask(populated, maskIdx);
    const score = calculatePenalty(testMatrix);
    if (score < bestScore) {
      bestMatrix = testMatrix;
      bestScore = score;
    }
  }

  return bestMatrix;
}
