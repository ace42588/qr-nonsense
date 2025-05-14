import { createMatrix, addCodewords, applyMask } from "./utils";
import { calculatePenalty } from "./calculatePenalty";
import { addPatterns, addFormatInfoModules } from "./modules";

export function getMatrix(
  codewords,
  dataMask,
  version,
  errorCorrectionLevel
) {
  const matrix = createMatrix(version);
  const base = addPatterns(matrix);
  const populated = addCodewords(base, codewords);

  if (dataMask !== -1) {
    const masked = applyMask(populated, dataMask);
    const final = addFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
    return { matrix: masked, dataMask };
  }

  // Automatic mask scoring
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const masked = applyMask(populated, maskIdx);
    const testMatrix = addFormatInfoModules(
      matrix,
      errorCorrectionLevel,
      maskIdx
    );
    const score = calculatePenalty(testMatrix);
    //console.debug("getMatrix", {bestScore, score});
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskIdx;
    }
  }

  return { matrix: applyMask(populated, bestMask), dataMask: bestMask };
}
