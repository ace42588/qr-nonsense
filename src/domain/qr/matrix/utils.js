import { calculatePenalty } from "./calculatePenalty";
import { makeModule } from "./modules";
import { getRemainderBits } from "../versionUtils";

export const DATA_MASKS = [
  (p) => (p.y + p.x) % 2 === 0,
  (p) => p.y % 2 === 0,
  (p) => p.x % 3 === 0,
  (p) => (p.y + p.x) % 3 === 0,
  (p) => (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0,
  (p) => ((p.x * p.y) % 2) + ((p.x * p.y) % 3) === 0,
  (p) => (((p.y * p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
  (p) => (((p.y + p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
];

const remainderBit = { value: 0, source: "Remainder" };

export function createMatrix(version) {
  //console.debug("createMatrix", {version});
  const length = version * 4 + 17;
  return Array.from({ length }, () => Array(length).fill(null));
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
  const maskFunc = DATA_MASKS[maskIndex] || (() => false); // No mask
  const masked = mapQRMatrix(matrix, ({ x, y, idx }, current) => {
    const isMasked = maskFunc({ x, y });
    //console.debug("applyMask", {current});
    return makeModule({ ...current, isMasked });
  });
  return masked;
}

export function addCodewords(matrix, codewords) {
  const numRemainder = getRemainderBits(matrix.length);
  const remainder = Array.from({ length: numRemainder }).map(
    () => remainderBit
  );
  //console.debug("addCodewords", { codewords, remainder });
  const codewordBits = codewords.flatMap((cw) => cw.bits);
  const bits = [...codewordBits, ...remainder];
  //console.debug("addCodewords", { bits });
  return mapQRMatrix(matrix, ({ x, y, idx }, current) => {
    const bit = bits[idx];
    return makeModule({ bit, x, y });
  });
}
