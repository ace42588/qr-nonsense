import { EC_INFO } from "./constants";

function getRequiredCodewords(ecBlocks) {
  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    0
  );
}

export function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    const versionInfo = gerVersionInfo(
      errorCorrectionLevel,
      version
    );
    const { capacity } = versionInfo

    if (totalDataBits <= capacity) {
      return versionInfo;
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
  return {
    version,
    ...versionInfo,
    requiredDataCodewords: getRequiredCodewords(versionInfo.ecBlocks),
  };
}
