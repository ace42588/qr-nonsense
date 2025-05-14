import { createBaseMatrix, addCodewords, applyMask } from "./utils";
import { calculatePenalty } from "./calculatePenalty";

export function generateMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  //console.debug("generateMatrix", { codewords });
  const base = createBaseMatrix(errorCorrectionLevel, version, dataMask);
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
