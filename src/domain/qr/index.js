export { getBits } from "./bitUtils";
export { calculatePenalty } from "./calculatePenalty";
import { getRequiredDataCodewords, getCodewords } from "./codewordUtils";
export { encodeInput, finalizeEncoding } from "./encoders";
import { generateMatrix } from "./matrixUtils";
import {
  getMinimumQRCodeVersion,
} from "./versionUtils";


export function getVersion(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function getEncodedMessage(dataSegments, version, errorCorrectionLevel) {
  const { segments, bits, idMap } = finalizeEncoding(
    dataSegments,
    version,
    errorCorrectionLevel
  );
  //console.debug("getEncodedMessage", { segments, bits, idMap });
  return { segments, bits, idMap };
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
