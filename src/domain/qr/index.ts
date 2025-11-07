import { Input, Segment } from "@/types/index.ts";
import { generateCodewords } from "./codewords/index.ts";
import { encodeAll, finalizeEncoding } from "./encoders/index";
import { getMinimumQRCodeVersion, gerVersionInfo } from "./versionUtils.ts";
import { log } from "@/lib/logger";

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
      : gerVersionInfo(errorCorrectionLevel, version);
  const segments = finalizeEncoding(encodedInputs, requiredDataCodewords);
  log.debug("getEncodedMessage", { segments, version: finalVersion });
  return { segments, version: finalVersion };
}

export const getCodewords = generateCodewords; 