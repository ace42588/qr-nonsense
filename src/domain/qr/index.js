import { getRequiredDataCodewords, getCodewords } from "./codewordUtils";
import { encodeAll, finalizeEncoding } from "./encoders";
import { generateMatrix } from "./matrixUtils";
import { getMinimumQRCodeVersion } from "./versionUtils";

export function getVersion(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function getEncodedMessage(inputs, sVersion, errorCorrectionLevel) {
  const [encodedInputs, numDataBits] = encodeAll(inputs);
  const version = sVersion === -1 ? getMinimumQRCodeVersion(numDataBits, errorCorrectionLevel) : sVersion;
  const numDataCodewords = getRequiredDataCodewords(version, errorCorrectionLevel);
  const { segments } = finalizeEncoding(
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
