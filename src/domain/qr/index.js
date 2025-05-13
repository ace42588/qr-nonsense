import { generateCodewords } from "./codewords";
import { encodeAll, finalizeEncoding } from "./encoders";
import { generateMatrix } from "./matrixUtils";
import { getMinimumQRCodeVersion } from "./versionUtils";

export function getEncodedMessage(inputs, sVersion, errorCorrectionLevel) {
  const [encodedInputs, numDataBits] = encodeAll(inputs);
  const [version, numDataCodewords] =
    sVersion === -1
      ? getMinimumQRCodeVersion(numDataBits, errorCorrectionLevel)
      : sVersion;
  const segments = finalizeEncoding(encodedInputs, numDataCodewords);
  return { segments, version };
}

export function getCodewords(segments, version, errorCorrectionLevel) {
  return generateCodewords(segments, version, errorCorrectionLevel);
}

export function getMatrix(
  codewords,
  selectedDataMask,
  version,
  errorCorrectionLevel
) {
  //console.debug("getMatrix", {bits});
  return generateMatrix({
    version,
    errorCorrectionLevel,
    dataMask: selectedDataMask,
    codewords,
  });
}
