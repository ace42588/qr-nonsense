import { DATA_MASKS, EC_INFO, CodewordLength } from "./Constants";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./ModuleUtils";
import { calculatePenalty } from "./calculatePenalty";
import { getCodewords } from "./CodewordUtils";
import { getEncoder } from "./encoders/Encoders";

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

export function getVersion(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function getQRDataFromInputs(
  inputs,
  errorCorrectionLevel,
  version,
  dataMask
) {
  console.debug("getQRDataFromInputs", { inputs });
  if (!Array.isArray(inputs)) return {};
  const init = {
    segments: [],
    segmentMap: [],
    bitMap: [],
  };
  const encodedInputs = inputs.map(({ data, mode, encoding }) =>
    getEncoder(mode).encode(data, encoding)
  );
  const encoded = encodedInputs.reduce((acc, curr) => {
    return {
      segments: [...acc.segments, ...curr.segments],
      segmentMap: new Map([...acc.segmentMap, ...curr.segmentMap]),
      bitMap: new Map([...acc.bitMap, ...curr.bitMap]),
    };
  }, init);

  const calculatedVersion = getVersion(
    encoded.bitMap.size,
    version,
    errorCorrectionLevel
  );
  const codewords = getCodewords(
    encodedInputs,
    calculatedVersion,
    errorCorrectionLevel
  );
  const { matrix, dataMask: calculatedDataMask } = generateQRCodeMatrix({
    version: calculatedVersion,
    errorCorrectionLevel,
    dataMask,
    codewords,
  });
  return {
    ...encoded,
    ecCodewords: codewords.filter((cw) => cw.type === "errorCorrection"),
    encodedInputs,
    calculatedVersion,
    codewords,
    matrix,
    calculatedDataMask,
  };
}

function generateQRCodeMatrix({
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
    addFormatInfoModules(matrix, errorCorrectionLevel, maskIndex);
    const maskFunc = DATA_MASKS[maskIndex];
    const masked = mapQRMatrix(matrix, ({ x, y, idx }, current) => {
      const isMasked = maskFunc({ x, y });
      //console.debug("applyMask", {current});
      return makeModule({ ...current, isMasked });
    });
    return masked;
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
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const testMatrix = applyMask(populated, maskIdx);
    const score = calculatePenalty(testMatrix);
    //console.debug("generateQRCodeMatrix", {bestScore, score});
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskIdx;
    }
  }

  //addFormatInfoModules(bestMatrix, errorCorrectionLevel, bestMask);
  return { matrix: applyMask(populated, bestMask), dataMask: bestMask };
}
