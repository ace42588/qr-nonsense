import { Segment } from "../shared/types";
import { Input } from "@/state/inputs/types";
import { encodeAll, finalizeEncoding } from "./encoders";
import { getNumBits } from "./encoders/utils";
import { getMinimumQRCodeVersion, getVersionInfo } from "./versionUtils";
import { cciVersionClass, updateCharCountIndicatorLengths } from "./charCount";

export interface EncodedMessage {
  segments: Segment[];
  version: number;
  error?: string | null;
  /** True when a fixed version was kept despite the payload not fitting. */
  invalid?: boolean;
  invalidReason?: string | null;
}

type ParsedInputs = Record<string, Input>;

export function getEncodedMessage(
  inputs: Input[] | ParsedInputs,
  sVersion: number | string,
  errorCorrectionLevel: number
): EncodedMessage {
  const version = parseInt(String(sVersion));
  const initialCciVersion = version === -1 ? 1 : version;
  let encodedInputs: Segment[];
  let numDataBits: number;
  let encodeError: string | null = null;
  try {
    const encoded = encodeAll(inputs, initialCciVersion);
    encodedInputs = encoded[0];
    numDataBits = encoded[1];
    encodeError = encoded[2] ?? null;
  } catch (err) {
    encodeError = err instanceof Error ? err.message : String(err);
    const fallback = getVersionInfo(errorCorrectionLevel, 1);
    return {
      segments: finalizeEncoding([], fallback.requiredDataCodewords),
      version: fallback.version,
      error: encodeError,
      invalid: false,
      invalidReason: null,
    };
  }

  let finalVersion: number;
  let requiredDataCodewords: number;
  try {
    const versionInfo =
      version === -1
        ? getMinimumQRCodeVersion(numDataBits, errorCorrectionLevel)
        : getVersionInfo(errorCorrectionLevel, version);
    finalVersion = versionInfo.version;
    requiredDataCodewords = versionInfo.requiredDataCodewords;

    if (cciVersionClass(finalVersion) !== cciVersionClass(initialCciVersion)) {
      const reencoded = encodeAll(inputs, finalVersion);
      encodedInputs = reencoded[0];
      numDataBits = reencoded[1];
      encodeError = encodeError || reencoded[2] || null;
    }
  } catch (err) {
    encodeError =
      encodeError || (err instanceof Error ? err.message : String(err));
    const fallback = getVersionInfo(errorCorrectionLevel, 1);
    return {
      segments: finalizeEncoding([], fallback.requiredDataCodewords),
      version: fallback.version,
      error: encodeError,
      invalid: false,
      invalidReason: null,
    };
  }

  try {
    const updatedInputs = updateCharCountIndicatorLengths(
      encodedInputs,
      finalVersion
    );
    const updatedNumDataBits = getNumBits(updatedInputs);
    let verifiedVersion = finalVersion;
    let verifiedRequiredDataCodewords = requiredDataCodewords;
    let finalInputs = updatedInputs;
    let overflowReason: string | null = null;

    if (version === -1) {
      const versionInfo = getMinimumQRCodeVersion(
        updatedNumDataBits,
        errorCorrectionLevel
      );
      verifiedVersion = versionInfo.version;
      verifiedRequiredDataCodewords = versionInfo.requiredDataCodewords;

      if (verifiedVersion !== finalVersion) {
        if (cciVersionClass(verifiedVersion) !== cciVersionClass(finalVersion)) {
          const reencoded = encodeAll(inputs, verifiedVersion);
          encodedInputs = reencoded[0];
          encodeError = encodeError || reencoded[2] || null;
        }
        finalInputs = updateCharCountIndicatorLengths(
          encodedInputs,
          verifiedVersion
        );
        const finalNumDataBits = getNumBits(finalInputs);
        const finalVersionInfo = getMinimumQRCodeVersion(
          finalNumDataBits,
          errorCorrectionLevel
        );
        verifiedVersion = finalVersionInfo.version;
        verifiedRequiredDataCodewords = finalVersionInfo.requiredDataCodewords;
      }
    } else {
      const versionInfo = getVersionInfo(errorCorrectionLevel, finalVersion);
      verifiedVersion = versionInfo.version;
      verifiedRequiredDataCodewords = versionInfo.requiredDataCodewords;

      const dataBits = getNumBits(finalInputs);
      const capacityBits = verifiedRequiredDataCodewords * 8;
      if (dataBits > capacityBits) {
        overflowReason = `Data does not fit in QR version ${verifiedVersion} (${dataBits} bits > ${capacityBits} bit capacity). The code is still generated and may not scan.`;
      }
    }

    const segments = finalizeEncoding(
      finalInputs,
      verifiedRequiredDataCodewords
    );
    return {
      segments,
      version: verifiedVersion,
      error: encodeError,
      invalid: Boolean(overflowReason),
      invalidReason: overflowReason,
    };
  } catch (err) {
    encodeError =
      encodeError || (err instanceof Error ? err.message : String(err));
    const fallback = getVersionInfo(errorCorrectionLevel, 1);
    return {
      segments: finalizeEncoding([], fallback.requiredDataCodewords),
      version: fallback.version,
      error: encodeError,
      invalid: false,
      invalidReason: null,
    };
  }
}
