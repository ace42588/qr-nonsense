import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { ReedSolomonEncoder } from "../reedsolomon/index.js";
import { TaggedCodeword, ECCodeword } from "../Tagged";
import { BitUtils, getBits } from "./BitUtils";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./ModuleUtils";
import { getRequiredDataCodewords, getCodewordsForBlock } from "./CodewordUtils"

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

export function gerVersionInfo(errorCorrectionLevel, version) {
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

function calculatePenalty(matrix) {
  const size = matrix.length;
  let score = 0;

  // Rule 1: same-color runs
  for (let y = 0; y < size; y++) {
    let runColor = null;
    let runLength = 0;
    for (let x = 0; x < size; x++) {
      const value = !!matrix[y][x]?.isDark;
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
      const value = !!matrix[y][x]?.isDark;
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
      const v = !!matrix[y][x]?.isDark;
      if (
        v === !!matrix[y][x + 1]?.isDark &&
        v === !!matrix[y + 1][x]?.isDark &&
        v === !!matrix[y + 1][x + 1]?.isDark
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
    const row = matrix[y].map((m) => (m?.isDark ? 1 : 0));
    if (checkPattern(row)) score += 40;
  }

  for (let x = 0; x < size; x++) {
    const col = matrix.map((row) => (row[x]?.isDark ? 1 : 0));
    if (checkPattern(col)) score += 40;
  }

  // Rule 4: dark/light balance
  const totalModules = size * size;
  const darkCount = matrix.flat().filter((m) => m?.isDark).length;
  const percent = (darkCount / totalModules) * 100;
  const fivePercentSteps = Math.abs(Math.round(percent / 5) - 10);
  score += fivePercentSteps * 10;

  return score;
}

export function generateQRCodeMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  const dimension = version * 4 + 17;

  function createBaseMatrix() {
    const matrix = Array.from({ length: dimension }, () =>
      Array(dimension).fill(null)
    );
    addNonDataModules(matrix, errorCorrectionLevel, version, dataMask);
    return matrix;
  }

  function mapQRMatrix(matrix, callbackFn) {
    const newMatrix = matrix.map((row) => [...row]);
    let up = true;
    let idx = 0;

    // write columns in pairs, right to left
    for (let col = dimension - 1; col > 0; col -= 2) {
      // Skip the vertical timing pattern column
      if (col === 6) col--;
      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;
        for (let offset = 0; offset < 2; offset++) {
          const x = col - offset;
          const module = newMatrix[y][x];
          // check if matrix position is used for pattern
          if (!module || (module && !module.nonData)) {
            newMatrix[y][x] = callbackFn({ x, y, idx }, module);
            idx++;
          }
        }
      }
      up = !up;
    }
    return newMatrix;
  }

  function applyMask(matrix, maskIndex) {
    //console.debug("applyMask", {matrix, maskIndex})
    const maskFunc = DATA_MASKS[maskIndex];
    return mapQRMatrix(matrix, ({ x, y, idx }, current) => {
      const isMasked = maskFunc({ x, y });
      //console.debug("applyMask", {current});
      return makeModule({ ...current, isMasked });
    });
  }

  function addCodewords(matrix) {
    const bits = codewords.flatMap((cw) => cw.bits);
    const remainderBit = { value: 0, source: "Remainder" };
    //console.debug("applyCodewords", { bits });
    return mapQRMatrix(matrix, ({ x, y, idx }, current) => {
      const bit = bits[idx] || remainderBit;
      return makeModule({ bit, x, y });
    });
  }

  const base = createBaseMatrix();
  const populated = addCodewords(base);

  if (dataMask !== -1) {
    const masked = applyMask(populated, dataMask);
    return { matrix: masked, dataMask };
  }

  // Automatic mask scoring
  let bestMatrix = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const testMatrix = applyMask(populated, maskIdx);
    const score = calculatePenalty(testMatrix);
    //console.debug("generateQRCodeMatrix", {bestScore, score});
    if (score < bestScore) {
      bestMatrix = testMatrix;
      bestScore = score;
      bestMask = maskIdx;
    }
  }

  addFormatInfoModules(bestMatrix, errorCorrectionLevel, bestMask);
  return { matrix: bestMatrix, dataMask: bestMask };
}
