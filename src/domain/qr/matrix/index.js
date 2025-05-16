import { createMatrix, addCodewords, applyMask } from "./utils";
import { calculatePenalty } from "./calculatePenalty";
import { addPatterns, updateFormatInfoModules } from "./modules";

export function getMatrix(codewords, dataMask, version, errorCorrectionLevel) {
  const matrix = createMatrix(version);
  const base = addPatterns(matrix);
  const populated = addCodewords(base, codewords);

  if (parseInt(dataMask) !== -1) {
    const masked = applyMask(populated, dataMask);
    const final = updateFormatInfoModules(
      matrix,
      errorCorrectionLevel,
      dataMask
    );
    return { matrix: final, dataMask };
  }

  // Automatic mask scoring
  let bestScore = Infinity;
  let bestMask = 0;
  let bestMatrix;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const masked = applyMask(populated, maskIdx);
    const testMatrix = updateFormatInfoModules(
      matrix,
      errorCorrectionLevel,
      maskIdx
    );
    const score = calculatePenalty(testMatrix);
    //console.debug("getMatrix", { bestScore, score });
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskIdx;
      bestMatrix = testMatrix;
    }
  }
  //console.debug("getMatrix", { bestMask });
  const masked = applyMask(populated, bestMask);
  const final = updateFormatInfoModules(matrix, errorCorrectionLevel, bestMask);

  return { matrix: final, dataMask: bestMask };
}
