import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { BitUtils } from "./BitUtils";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./ModuleUtils";
import {
  getCodewordsForBlock,
  getRequiredDataCodewords,
} from "./CodewordUtils";
import { calculatePenalty } from "./calculatePenalty";
import { finalizeEncoding } from "./Encoders";

function getBlocks(encodedData, errorCorrectionLevel, version) {
  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
  let lastBlockId = 0;
  let numProcessedCodewords = 0;

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
          numProcessedCodewords,
          encodedData
        );
        numProcessedCodewords += dataCodewordsPerBlock;
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
  if (!versions) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }
  const versionInfo = versions[version];
  if (!versionInfo) {
    throw new Error("Invalid QR version: " + version);
  }
  return versionInfo;
}

export const QRUtils = {
  getCodewords(encodedInputs, version, errorCorrectionLevel) {
    const requiredDataCodewords = getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    const encodedData = finalizeEncoding(encodedInputs, requiredDataCodewords);
    const qrBlocks = getBlocks(encodedData, errorCorrectionLevel, version);
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
    console.debug("QRUtils.getCodewords", { orderedCodewords });
    return orderedCodewords;
  },
  getVersion(numBits, inputVersion, errorCorrectionLevel) {
    let version = parseInt(inputVersion) || -1;
    if (1 <= version && version <= 40) {
      return version;
    } else if (version == -1) {
      return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
    }
    throw new Error(`Invalid version: ${inputVersion.toString()}`);
  },
};

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
import { DATA_MASKS, EC_INFO, CodewordLength } from "../Constants";
import { BitUtils } from "./BitUtils";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./ModuleUtils";
import {
  getCodewordsForBlock,
  getRequiredDataCodewords,
} from "./CodewordUtils";
import { calculatePenalty } from "./calculatePenalty";
import { finalizeEncoding } from "./Encoders";

function getBlocks(encodedInputs, errorCorrectionLevel, version) {
  const { ecCodewordsPerBlock, ecBlocks } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );
  let lastBlockId = 0;
  let numProcessedCodewords = 0;

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
          numProcessedCodewords,
          encodedInputs,
          version,
          errorCorrectionLevel
        );
        numProcessedCodewords += dataCodewordsPerBlock;
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
  if (!versions) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }
  const versionInfo = versions[version];
  if (!versionInfo) {
    throw new Error("Invalid QR version: " + version);
  }
  return versionInfo;
}

export const QRUtils = {
  getCodewords(encodedInputs, version, errorCorrectionLevel) {
    const requiredDataCodewords = getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    const encodedData = finalizeEncoding(encodedInputs, requiredDataCodewords);
    const qrBlocks = getBlocks(encodedData, errorCorrectionLevel, version);
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
    console.debug("QRUtils.getCodewords", { orderedCodewords });
    return orderedCodewords;
  },
  getVersion(numBits, inputVersion, errorCorrectionLevel) {
    let version = parseInt(inputVersion) || -1;
    if (1 <= version && version <= 40) {
      return version;
    } else if (version == -1) {
      return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
    }
    throw new Error(`Invalid version: ${inputVersion.toString()}`);
  },
};

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
