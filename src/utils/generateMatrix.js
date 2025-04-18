import { DATA_MASKS } from "../Constants";
import {
  addFormatInfoModules,
  addNonDataModules,
  makeModule,
} from "./ModuleUtils";

function qrMatrix(size) {}

export function generateQRCodeMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  console.debug("generateQRCodeMatrix", {
    version,
    errorCorrectionLevel,
    dataMask,
    codewords,
  });
  const dimension = version * 4 + 17;

  function createBaseMatrix() {
    const matrix = Array.from({ length: dimension }, () =>
      Array(dimension).fill(null)
    );
    matrix.map = (matrix, callbackFn) => {
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
          if (module && !module.nonData) {
            idx++;
            newMatrix[y][x] = callbackFn({ x, y, idx }, module);
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
      //console.debug("applyMask", {current});
      const isMasked = maskFunc({ x, y });
      const { value: existingValue } = current;
      return {
        ...current,
        isDark: isMasked ? !existingValue : existingValue,
        isMasked,
      };
    });
  }

  function addCodewords(matrix) {
    const bits = codewords.flatMap((cw) => cw.bits);
    const remainderBit = { value: 0, source: "Remainder" };
    console.debug("applyCodewords", { bits });
    return mapQRMatrix(matrix, ({ x, y, idx }, current) => {
      const bit = bits[idx] || remainderBit;
      return makeModule({ taggedBit: bit, x, y, masked: false });
    });
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
  const populated = addCodewords(base);

  if (dataMask !== -1) {
    const masked = applyMask(populated, dataMask);
    console.debug("generateQRCodeMatrix", { populated });
    return { matrix: masked, dataMask };
  }

  // Automatic mask scoring
  let bestMatrix = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const testMatrix = applyMask(populated, maskIdx);
    const score = calculatePenalty(testMatrix);
    if (score < bestScore) {
      bestMatrix = testMatrix;
      bestScore = score;
      bestMask = maskIdx;
    }
  }

  addFormatInfoModules(bestMatrix, errorCorrectionLevel, bestMask);
  return { matrix: bestMatrix, dataMask: bestMask };
}
