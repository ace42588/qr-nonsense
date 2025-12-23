import { Segment } from "../shared/types";
import { Input } from "@/app/types";
import { generateCodewords } from "./codewords";
import { encodeAll, finalizeEncoding } from "./encoders";
import { getMinimumQRCodeVersion, getVersionInfo } from "./versionUtils";
import { generateBlocks, QRBlock } from "./codewords/blocks";
import { getCodewordsFromSegments } from "./codewords/utils";

interface EncodedMessage {
  segments: Segment[];
  version: number;
}

export function getEncodedMessage(
  inputs: Input[],
  sVersion: number | string,
  errorCorrectionLevel: number
): EncodedMessage {
  const version = parseInt(String(sVersion));
  const [encodedInputs, numDataBits] = encodeAll(inputs);
  const { version: finalVersion, requiredDataCodewords } =
    version === -1
      ? getMinimumQRCodeVersion(numDataBits, errorCorrectionLevel)
      : getVersionInfo(errorCorrectionLevel, version);
  const segments = finalizeEncoding(encodedInputs, requiredDataCodewords);
  //log.debug("getEncodedMessage", { segments, version: finalVersion });
  return { segments, version: finalVersion };
}

export function getBlocks(inputs: Input[], version: number, errorCorrectionLevel: number): QRBlock[] {
  const segments = getEncodedMessage(inputs, version, errorCorrectionLevel).segments;
  const { ecCodewordsPerBlock, ecBlocks } = getVersionInfo(errorCorrectionLevel, version);
  const dataCodewords = getCodewordsFromSegments(segments);
  return generateBlocks(dataCodewords, ecCodewordsPerBlock, ecBlocks);
}

export const getCodewords = generateCodewords;

