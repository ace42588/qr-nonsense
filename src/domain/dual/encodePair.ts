import { parseAll } from "@/domain/input";
import { getEncodedMessage, getCodewords } from "@/domain/qr";
import { getMatrix } from "@/domain/qr/matrix";
import type { QRMatrix } from "@/domain/shared/types";
import type { Input } from "@/state/inputs/types";

export interface EncodePairOptions {
  inputsA: Input[];
  inputsB: Input[];
  version: number;
  errorCorrectionLevel: number;
  /** -1 / null = auto (resolve from A, force onto B). */
  dataMask: number | null;
}

export interface EncodePairResult {
  matrixA: QRMatrix | null;
  matrixB: QRMatrix | null;
  version: number;
  dataMask: number;
  errorA: string | null;
  errorB: string | null;
  invalidA: boolean;
  invalidB: boolean;
  invalidReasonA: string | null;
  invalidReasonB: string | null;
}

function encodeOne(
  inputs: Input[],
  version: number,
  errorCorrectionLevel: number,
  dataMask: number
): {
  matrix: QRMatrix | null;
  version: number;
  dataMask: number;
  error: string | null;
  invalid: boolean;
  invalidReason: string | null;
} {
  const parsed = parseAll(inputs);
  const encoded = getEncodedMessage(parsed, version, errorCorrectionLevel);
  if (encoded.error && (!encoded.segments || encoded.segments.length === 0)) {
    return {
      matrix: null,
      version: encoded.version,
      dataMask: typeof dataMask === "number" && dataMask >= 0 ? dataMask : 0,
      error: encoded.error,
      invalid: Boolean(encoded.invalid),
      invalidReason: encoded.invalidReason ?? null,
    };
  }

  const segmentsWithBitIds = encoded.segments.map((s) => ({ ...s }));
  const { codewords } = getCodewords(
    segmentsWithBitIds,
    encoded.version,
    errorCorrectionLevel
  );
  const { matrix, dataMask: usedMask } = getMatrix(
    codewords,
    dataMask,
    encoded.version,
    errorCorrectionLevel
  );

  return {
    matrix,
    version: encoded.version,
    dataMask: usedMask,
    error: encoded.error ?? null,
    invalid: Boolean(encoded.invalid),
    invalidReason: encoded.invalidReason ?? null,
  };
}

/**
 * Encode two independent input lists into QR matrices with a shared version and mask.
 * Auto version (-1): max(requiredA, requiredB). Auto mask (-1/null): A's choice forced onto B.
 */
export function encodePair(options: EncodePairOptions): EncodePairResult {
  const {
    inputsA,
    inputsB,
    version: selectedVersion,
    errorCorrectionLevel,
    dataMask: selectedMask,
  } = options;

  const maskArg =
    selectedMask === null || selectedMask === undefined
      ? -1
      : selectedMask;

  // First pass: discover required versions when Auto
  const passA = encodeOne(inputsA, selectedVersion, errorCorrectionLevel, maskArg);
  const passB = encodeOne(inputsB, selectedVersion, errorCorrectionLevel, maskArg);

  let sharedVersion = selectedVersion;
  if (selectedVersion === -1) {
    sharedVersion = Math.max(passA.version, passB.version);
  }

  // Resolve shared mask from A at the shared version, then encode BOTH with that
  // explicit mask so Auto and forced paths cannot diverge.
  const aForMask = encodeOne(
    inputsA,
    sharedVersion,
    errorCorrectionLevel,
    maskArg
  );
  const sharedMask = maskArg === -1 ? aForMask.dataMask : maskArg;

  const finalA = encodeOne(
    inputsA,
    sharedVersion,
    errorCorrectionLevel,
    sharedMask
  );
  const finalB = encodeOne(
    inputsB,
    sharedVersion,
    errorCorrectionLevel,
    sharedMask
  );

  const dimA = finalA.matrix?.length ?? 0;
  const dimB = finalB.matrix?.length ?? 0;
  if (dimA > 0 && dimB > 0 && dimA !== dimB) {
    return {
      matrixA: finalA.matrix,
      matrixB: null,
      version: sharedVersion,
      dataMask: sharedMask,
      errorA: finalA.error,
      errorB:
        finalB.error ||
        `Payload B matrix size (${dimB}) does not match Payload A (${dimA})`,
      invalidA: finalA.invalid,
      invalidB: true,
      invalidReasonA: finalA.invalidReason,
      invalidReasonB: `Matrix dimension mismatch: A=${dimA}, B=${dimB}`,
    };
  }

  return {
    matrixA: finalA.matrix,
    matrixB: finalB.matrix,
    version: sharedVersion === -1 ? finalA.version : sharedVersion,
    dataMask: sharedMask,
    errorA: finalA.error,
    errorB: finalB.error,
    invalidA: finalA.invalid,
    invalidB: finalB.invalid,
    invalidReasonA: finalA.invalidReason,
    invalidReasonB: finalB.invalidReason,
  };
}
