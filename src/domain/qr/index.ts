import { Input } from "@/state/inputs/types";
import { generateCodewords } from "./codewords";
import { getVersionInfo } from "./versionUtils";
import { generateBlocks, QRBlock } from "./codewords/blocks";
import { getCodewordsFromSegments } from "./codewords/utils";
import { getEncodedMessage } from "./encodeMessage";

export { getCharCountIndicatorLength, cciVersionClass, updateCharCountIndicatorLengths } from "./charCount";
export { getEncodedMessage, type EncodedMessage } from "./encodeMessage";
export {
  encodeSegments,
  buildCodewords,
  buildMatrix,
} from "./stages";

export function getBlocks(inputs: Input[], version: number, errorCorrectionLevel: number): QRBlock[] {
  const segments = getEncodedMessage(inputs, version, errorCorrectionLevel).segments;
  const { ecCodewordsPerBlock, ecBlocks } = getVersionInfo(errorCorrectionLevel, version);
  const dataCodewords = getCodewordsFromSegments(segments);
  return generateBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
}

export const getCodewords = generateCodewords;
