import { DATA_MASKS } from "../Constants";
import {
  addFormatInfoModules,
  makeModule,
} from "./ModuleUtils";
import { calculatePenalty } from "./calculatePenalty"

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
  this.setModule = function(x, y, value) {
    const newMatrix = matrix.map((row) => [...row]);
    newMatrix[y][x] = value;
  }
}

function addNonDataModules(
  matrix,
  errorCorrectionLevel,
  version,
  dataMask
) {
  const size = matrix.length;

  function addAlignmentPatterns() {
    const source = "AlignmentPattern";
    if (version === 1) return [];

    function shouldDrawAlignmentPattern(x, y) {
      const finderPatternPositions = [
        { x: 0, y: 0 },
        { x: size - 7, y: 0 },
        { x: 0, y: size - 7 },
      ];

      for (const pos of finderPatternPositions) {
        if (Math.abs(pos.x - x) < 9 && Math.abs(pos.y - y) < 9) {
          return false;
        }
      }
      return true;
    }

    function drawAlignmentPattern(centerX, centerY) {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const value = ALIGNMENT_PATTERN[y][x];
          matrix[centerY - 2 + y][centerX - 2 + x] = makeNonDataModule(
            value,
            source,
            centerX - 2 + x,
            centerY - 2 + y
          );
        }
      }
    }

    const positions = getAlignmentPatternPositions(version);

    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (shouldDrawAlignmentPattern(positions[i], positions[j])) {
          drawAlignmentPattern(positions[i], positions[j]);
        }
      }
    }
  }

  function addFinderPatterns() {
    const source = "FinderPattern";
    function addPattern(startX, startY) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const value = FINDER_PATTERN[y][x];
          matrix[startY + y][startX + x] = makeNonDataModule(
            value,
            source,
            startX + x,
            startY + y
          );
        }
      }
    }

    addPattern(0, 0);
    addPattern(size - 7, 0);
    addPattern(0, size - 7);
  }

  function addSeparators() {
    const source = "Separator";

    for (let i = 0; i < 8; i++) {
      // Top-left separator
      matrix[i][7] = makeNonDataModule(0, source, 7, i);
      matrix[7][i] = makeNonDataModule(0, source, i, 7);
      // Top-right separator
      matrix[i][size - 8] = makeNonDataModule(0, source, size - 8, i);
      matrix[7][size - 1 - i] = makeNonDataModule(0, source, size - 1 - i, 7);
      // Bottom-left separator
      matrix[size - 1 - i][7] = makeNonDataModule(0, source, 7, size - 1 - i);
      matrix[size - 8][i] = makeNonDataModule(0, source, i, size - 8);
    }
  }

  function addTimingPatterns() {
    const source = "TimingPattern";
    for (let i = 8; i < size - 8; i++) {
      const value = (i % 2 === 0) ? 1 : 0;
      matrix[6][i] = makeNonDataModule(value, source, i, 6);
      matrix[i][6] = makeNonDataModule(value, source, 6, i);
    }
  }

  function addVersionInfo() {
    function getVersionString() {
      const versionBits = VERSION_INFO[version].toString(2).padStart(6, "0");
      const paddedVersionBits = versionBits.padEnd(18, "0");

      const errorCorrectionBits = computeBCH(paddedVersionBits, 12);
      return (versionBits + errorCorrectionBits).padStart(18, "0");
    }
    if (version < 7) return;
    const source = "VersionInfo";
    const versionString = getVersionString();

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j];
        // Bottom-left version information
        matrix[size - 11 + j][i] = makeNonDataModule(
          value,
          source,
          size - 11 + j,
          i
        );
        // Top-right version information
        matrix[i][size - 11 + j] = makeNonDataModule(
          value,
          source,
          i,
          size - 11 + j
        );
      }
    }
  }

  addAlignmentPatterns();
  addFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
  addFinderPatterns();
  addSeparators();
  addTimingPatterns();
  addVersionInfo();

  return matrix;
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

  function applyMask(maskIndex) {
    //console.debug("applyMask", {matrix, maskIndex})
    const maskFunc = DATA_MASKS[maskIndex];
    return matrix.map(matrix, ({ x, y, idx }, current) => {
      const isMasked = maskFunc({ x, y });
      //console.debug("applyMask", {current});
      return makeModule({...current, isMasked});
    });
  }

  function addCodewords() {
    const bits = codewords.flatMap((cw) => cw.bits);
    const remainderBit = { value: 0, source: "Remainder" };
    //console.debug("applyCodewords", { bits });
    return matrix.map(matrix, ({ x, y, idx }, current) => {
      const bit = bits[idx] || remainderBit;
      return makeModule({ bit, x, y });
    });
  }

  const populated = addCodewords();

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
