import { generateCodewords} from "./codewords";
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
  return {segments, version};
}

export function getCodewords(segments, version, errorCorrectionLevel) {
  
}

export function getMatrix(
  errorCorrectionLevel,
  version,
  selectedDataMask,
  bits
) {
  if (bits.length === 0) return {};
  //console.debug("getMatrix", {bits});
  const codewords = getCodewords(bits, version, errorCorrectionLevel);
  return generateMatrix({
    version,
    errorCorrectionLevel,
    dataMask: selectedDataMask,
    codewords,
  });
}
