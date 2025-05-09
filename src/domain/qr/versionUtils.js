import { EC_INFO } from "./constants";

const CodewordLength = 8;

export function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  console.debug("getMinimumQRCodeVersion", {totalDataBits})
  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    const { capacity } = gerVersionInfo(errorCorrectionLevel, version);
    // The total bits must be rounded up to the next whole 8-bit codeword.
    const requiredBytes = Math.ceil(totalDataBits / CodewordLength);
    if (totalDataBits <= capacity * CodewordLength) {
      return version;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
}

export function gerVersionInfo(errorCorrectionLevel, version) {
  const versions = EC_INFO[errorCorrectionLevel];
  if (!versions) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }
  const versionInfo = versions[version];
  if (!versionInfo) {
    throw new Error("Invalid QR version: " + version);
  }
  return versionInfo;
}
