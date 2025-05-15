import { generateCodewords } from "./codewords";
import { encodeAll, finalizeEncoding } from "./encoders";
import { getMinimumQRCodeVersion } from "./versionUtils";

export { getMatrix } from "./matrix";
export { evaluateQRCodeQuality } from "./evaluator.js";

export function getEncodedMessage(inputs, sVersion, errorCorrectionLevel) {
  sVersion = parseInt(sVersion);
  const [encodedInputs, numDataBits] = encodeAll(inputs);
  const [version, numDataCodewords] =
    sVersion === -1
      ? getMinimumQRCodeVersion(numDataBits, errorCorrectionLevel)
      : sVersion;
  const segments = finalizeEncoding(encodedInputs, numDataCodewords);
  console.debug("getEncodedMessage", { segments, version });
  return { segments, version };
}

export const getCodewords = generateCodewords;
