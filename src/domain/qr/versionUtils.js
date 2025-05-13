import { EC_INFO } from "./constants";

export function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  //console.debug("getMinimumQRCodeVersion", {totalDataBits})
  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    const { capacity, ecBlocks } = gerVersionInfo(
      errorCorrectionLevel,
      version
    );

    if (totalDataBits <= capacity) {
      let requiredDataCodewords = ecBlocks.reduce(
        (total, { numBlocks, dataCodewordsPerBlock }) =>
          total + numBlocks * dataCodewordsPerBlock,
        0
      );
      return [version];
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

export function getVersion(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function getRequiredDataCodewords(version, errorCorrectionLevel) {
  const { ecBlocks } = gerVersionInfo(errorCorrectionLevel, version);
  let requiredDataCodewords = 0;

  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    requiredDataCodewords
  );
}
