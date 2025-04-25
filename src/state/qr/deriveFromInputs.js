import { getCodewords, getEncoder, getMinimumQRCodeVersion } from "../../domain/qr";

export function deriveVersionFromInputs(
  numBits,
  inputVersion,
  errorCorrectionLevel
) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function deriveSegmentsFromInputs(inputs) {
  const segments = inputs.map(({ data, mode, encoding }) =>
    getEncoder(mode).encode(data, encoding)
  );
  return segments;
}

export const deriveCodewordsFromSegments = getCodewords;