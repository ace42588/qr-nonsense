import { useMemo } from "react";
import { useInputs } from "@/state/inputs/InputContext";
import { useParsedInputs } from "@/hooks/useParsedInputs";
import { getEncodedMessage, getCodewords } from "@/domain/qr";
import { getMatrix } from "@/domain/qr/matrix";
import { Codeword, QRMatrix, Segment } from "@/domain/shared/types";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { VersionInfo, getVersionInfo } from "@/domain/qr/versionUtils";

interface DerivedQRData {
  segments: Segment[];
  codewords: Codeword[];
  blocks: QRBlock[];
  versionInfo: VersionInfo;
  matrix: QRMatrix;
  dataMask: number;
  encodeError: string | null;
  invalidQR: boolean;
  invalidQRReason: string | null;
}

function fallbackVersionInfo(errorCorrectionLevel: number): VersionInfo {
  try {
    return getVersionInfo(errorCorrectionLevel, 1);
  } catch {
    return getVersionInfo(0, 1);
  }
}

export function useDerivedQRData(): DerivedQRData {
  const {
    formatInfo: {
      version: selectedVersion,
      dataMask: selectedDataMask,
      errorCorrectionLevel,
    },
  } = useInputs();
  const parsedInputs = useParsedInputs();

  const {
    segments: initialSegments,
    version,
    error: encodeError,
    invalid: invalidQR,
    invalidReason: invalidQRReason,
  } = useMemo(() => {
    try {
      const result = getEncodedMessage(
        parsedInputs,
        selectedVersion,
        errorCorrectionLevel
      );
      return {
        segments: result.segments,
        version: result.version,
        error: result.error ?? null,
        invalid: result.invalid ?? false,
        invalidReason: result.invalidReason ?? null,
      };
    } catch (err) {
      return {
        segments: [] as Segment[],
        version: 1,
        error: err instanceof Error ? err.message : String(err),
        invalid: false,
        invalidReason: null,
      };
    }
  }, [parsedInputs, selectedVersion, errorCorrectionLevel]);

  const versionInfo = useMemo(() => {
    try {
      return getVersionInfo(errorCorrectionLevel, version);
    } catch {
      return fallbackVersionInfo(errorCorrectionLevel);
    }
  }, [errorCorrectionLevel, version]);

  // CRITICAL DATA FLOW FOR HIGHLIGHTING:
  // 1. Segments are created from inputs (initialSegments)
  // 2. getCodewords() is called, which:
  //    - Calls getBitsFromSegments() to create bits with UUIDs
  //    - Mutates segments to set segment.bitIds = bits.map(b => b.id)
  //    - Returns codewords containing those same bit objects
  //    - Returns blocks containing the data and error correction codewords
  // 3. The matrix is created from those codewords, so matrix modules have bit.id matching segment.bitIds
  // 4. When a symbol is clicked, we use segment.bitIds to highlight modules
  //
  // IMPORTANT: Segments MUST remain stable across re-renders. If segments are recreated,
  // they get new bitIds and won't match the matrix. This is why useParsedInputs is memoized.
  const { codewords, blocks, segments } = useMemo(() => {
    try {
      const segmentsWithBitIds = initialSegments.map((s) => ({ ...s }));
      const { codewords, blocks } = getCodewords(
        segmentsWithBitIds,
        version,
        errorCorrectionLevel
      );
      return { codewords, blocks, segments: segmentsWithBitIds };
    } catch {
      return {
        codewords: [] as Codeword[],
        blocks: [] as QRBlock[],
        segments: initialSegments,
      };
    }
  }, [initialSegments, version, errorCorrectionLevel]);

  // CRITICAL: The matrix must use the same codewords that were created from segments.
  // This ensures matrix modules have bit.id values that match segment.bitIds.
  const { matrix, dataMask } = useMemo(() => {
    try {
      return getMatrix(
        codewords,
        selectedDataMask ?? -1,
        version,
        errorCorrectionLevel
      );
    } catch {
      return { matrix: [] as unknown as QRMatrix, dataMask: 0 };
    }
  }, [errorCorrectionLevel, version, selectedDataMask, codewords]);

  return {
    segments,
    codewords,
    blocks,
    versionInfo,
    matrix,
    dataMask,
    encodeError,
    invalidQR,
    invalidQRReason,
  };
}
