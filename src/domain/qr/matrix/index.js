export function generateMatrix({
  version,
  errorCorrectionLevel,
  dataMask,
  codewords,
}) {
  //console.debug("generateMatrix", { codewords });
  const dimension = version * 4 + 17;

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