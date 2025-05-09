import {
  getCodewords,
} from "../../domain/qr";
import { DATA_MASKS } from "./constants";
import { calculatePenalty } from "./calculatePenalty";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./moduleUtils";

const remainderBit = { value: 0, source: "Remainder" };

export function generateMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  //console.debug("generateMatrix", { codewords });
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

export function getMatrix(
  errorCorrectionLevel,
  version,
  selectedDataMask,
  bits
) {
  if (bits.length === 0) return {};
  //console.debug("getMatrix", {bits});
  const codewords = getCodewords(bits, version, errorCorrectionLevel);
  return generateMatrix({
    version,
    errorCorrectionLevel,
    dataMask: selectedDataMask,
    codewords,
  });
}