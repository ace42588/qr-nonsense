import { createMatrix, addCodewords, applyMask } from "./utils";
import { calculatePenalty } from "./calculatePenalty";
import { addPatterns, updateFormatInfoModules } from "./modules";

export function getMatrix(
  codewords,
  dataMask,
  version,
  errorCorrectionLevel
) {
  const matrix = createMatrix(version);
  const base = addPatterns(matrix);
  const populated = addCodewords(base, codewords);

  console.debug("getMatrix", {dataMask});
  if (parseInt(dataMask) !== -1) {
    const masked = applyMask(populated, dataMask);
    const final = updateFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
    return { matrix: masked, dataMask };
  }

  // Automatic mask scoring
  console.debug("getMatrix: automatic dataMask scoring");
  let bestScore = Infinity;
  let bestMask = 0;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    const masked = applyMask(populated, maskIdx);
    const testMatrix = updateFormatInfoModules(
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
