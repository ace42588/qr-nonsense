import { DATA_MASKS, FINDER_PATTERN } from "../Constants";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./moduleUtils";
import { calculatePenalty } from "./calculatePenalty";

function QRMatrix(dimension) {
  const matrix = Array.from({ length: dimension }, () =>
    Array(dimension).fill(null)
  );
  this.map = function (callbackFn) {
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
          if (module && !module.nonData) {
            idx++;
            newMatrix[y][x] = callbackFn({ x, y, idx }, module);
          }
        }
      }
      up = !up;
    }
    return newMatrix;
  };
  this.setModule = function (x, y, value) {
    const newMatrix = matrix.map((row) => [...row]);
    newMatrix[y][x] = value;
  };
}

function addCodewords(matrix, codewords) {
  const remainderBit = { value: 0, source: "Remainder" };
  const bits = codewords.flatMap((cw) => cw.bits);
  //console.debug("applyCodewords", { bits });
  return matrix.map(matrix, ({ x, y, idx }, current) => {
    const bit = bits[idx] || remainderBit;
    return makeModule({ bit, x, y });
  });
}

function maskModules(matrix, maskIndex) {
  //console.debug("applyMask", {matrix, maskIndex})
  const maskFunc = DATA_MASKS[maskIndex];
  return matrix.map(matrix, ({ x, y, idx }, current) => {
    const isMasked = maskFunc({ x, y });
    //console.debug("applyMask", {current});
    return makeModule({ ...current, isMasked });
  });
}

function applyDataMask(matrix, dataMask) {
  if (dataMask !== -1) {
    const masked = maskModules(matrix, dataMask);
    return { matrix: masked, dataMask };
  }
  // Automatic mask scoring
  let bestMatrix = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const testMatrix = maskModules(matrix, maskIdx);
    const score = calculatePenalty(testMatrix);
    //console.debug("generateQRCodeMatrix", {bestScore, score});
    if (score < bestScore) {
      bestMatrix = testMatrix;
      bestScore = score;
      bestMask = maskIdx;
    }
  }
  return { matrix: bestMatrix, dataMask: bestMask };
}

export function generateQRCodeMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  const dimension = version * 4 + 17;
  let matrix = new QRMatrix(dimension);
  matrix = addNonDataModules(matrix, errorCorrectionLevel, version, dataMask);
  matrix = addCodewords(matrix, codewords);
  let { matrix: maskedMatrix, dataMask: selectedMask } = applyDataMask(
    matrix,
    dataMask
  );
  addFormatInfoModules(maskedMatrix, errorCorrectionLevel, selectedMask);

  return { matrix: maskedMatrix, dataMask: selectedMask };
}
