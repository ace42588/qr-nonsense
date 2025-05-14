import { generateCodewords } from "./codewords";
import { encodeAll, finalizeEncoding } from "./encoders";
import { generateMatrix } from "./matrix";
import { getMinimumQRCodeVersion } from "./versionUtils";
export { evaluateQRCodeQuality } from "./evaluator.js";

export function getEncodedMessage(inputs, sVersion, errorCorrectionLevel) {
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
export const getMatrix = generateMatrix;
