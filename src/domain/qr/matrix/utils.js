import { DATA_MASKS } from "./constants";
import { calculatePenalty } from "./calculatePenalty";
import {
  addFormatInfoModules,
  makeModule,
} from "./modules";

const remainderBit = { value: 0, source: "Remainder" };

export function createMatrix(version) {
  const dimension = version * 4 + 17;
  const matrix = Array.from({ length: dimension }, () =>
    Array(dimension).fill(null)
  );
  return matrix;
}

export function mapQRMatrix(matrix, callbackFn) {
  const dimension = matrix.length;
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
        const module = matrix[y][x];
        // check if matrix position is used for pattern
        if (!module || (module && !module.nonData)) {
          matrix[y][x] = callbackFn({ x, y, idx }, module);
          idx++;
        }
      }
    }
    up = !up;
  }
  return matrix;
}

export function applyMask(matrix, maskIndex) {
  //console.debug("applyMask", {matrix, maskIndex})
  const maskFunc = DATA_MASKS[maskIndex];
  const masked = mapQRMatrix(matrix, ({ x, y, idx }, current) => {
    const isMasked = maskFunc({ x, y });
    //console.debug("applyMask", {current});
    return makeModule({ ...current, isMasked });
  });
  return masked;
}

export function addCodewords(matrix, codewords) {
  const bits = codewords.flatMap((cw) => cw.bits);
  //console.debug("addCodewords", { bits });
  return mapQRMatrix(matrix, ({ x, y, idx }, current) => {
    const bit = bits[idx] || remainderBit;
    return makeModule({ bit, x, y });
  });
}
