import { getBlocks } from "./blocks";
import { gerVersionInfo } from "../versionUtils";
import { getCodewordsFromSegments, interleave } from "./utils";

export function generateCodewords(segments, version, errorCorrectionLevel) {
  //const encodedBits = getBitsFromSegments(segments);
  const dataCodewords = getCodewordsFromSegments(segments);
  console.debug("generateCodewords", {dataCodewords});

  const { ecCodewordsPerBlock, ecBlocks, remainderBits } = gerVersionInfo(
    errorCorrectionLevel,
    version
  );

  const qrBlocks = getBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
  console.debug("generateCodewords", {qrBlocks});
  return [
    ...interleave(qrBlocks.map((b) => b.data)),
    ...interleave(qrBlocks.map((b) => b.errorCorrection))
  ];
}

export const getCodewords = generateCodewords;
