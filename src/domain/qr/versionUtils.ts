import { EC_INFO, REMAINDER_BITS } from "./constants/errorCorrectionInfo";
import { ECBlock } from "../shared/types";

export interface VersionInfo {
  version: number;
  capacity: number;
  ecCodewordsPerBlock: number;
  ecBlocks: ECBlock[];
  remainderBits: number;
  requiredDataCodewords: number;
}

function getRequiredCodewords(ecBlocks: ECBlock[]): number {
  return ecBlocks.reduce(
    (total, { numBlocks, dataCodewordsPerBlock }) =>
      total + numBlocks * dataCodewordsPerBlock,
    0
  );
}

export function getMinimumQRCodeVersion(
  totalDataBits: number,
  errorCorrectionLevel: number
): VersionInfo {
  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    const versionInfo = getVersionInfo(
      errorCorrectionLevel,
      version
    );
    const { capacity } = versionInfo;

    if (totalDataBits <= capacity) {
      return versionInfo;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
}

export function getVersionInfo(
  errorCorrectionLevel: number,
  version: number
): VersionInfo {
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
    remainderBits: REMAINDER_BITS[version] ?? 0,
    requiredDataCodewords: getRequiredCodewords(versionInfo.ecBlocks),
  };
}

export function getRemainderBits(matrixWidth: number): number {
  const version = (matrixWidth - 17) / 4;
  return REMAINDER_BITS[version] ?? 0; // Handle potential null case
} 