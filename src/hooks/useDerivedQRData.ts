import { useMemo } from "react";
import { useInputs } from "@/state/inputs/InputContext.tsx";
import { useParsedInputs } from "@/hooks/useParsedInputs";
import { getEncodedMessage, getCodewords } from "@/domain/qr/index.ts";
import { getMatrix } from "@/domain/qr/matrix";
import { Codeword, QRMatrix, Segment } from "@/types";

interface DerivedQRData {
  segments: Segment[];
  codewords: Codeword[];
  version: number;
  matrix: QRMatrix;
  dataMask: number;
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

  const { segments: initialSegments, version } = useMemo(
    () =>
      getEncodedMessage(parsedInputs, selectedVersion, errorCorrectionLevel),
    [parsedInputs, selectedVersion, errorCorrectionLevel]
  );

  // CRITICAL DATA FLOW FOR HIGHLIGHTING:
  // 1. Segments are created from inputs (initialSegments)
  // 2. getCodewords() is called, which:
  //    - Calls getBitsFromSegments() to create bits with UUIDs
  //    - Mutates segments to set segment.bitIds = bits.map(b => b.id)
  //    - Returns codewords containing those same bit objects
  // 3. The matrix is created from those codewords, so matrix modules have bit.id matching segment.bitIds
  // 4. When a symbol is clicked, we use segment.bitIds to highlight modules
  //
  // IMPORTANT: Segments MUST remain stable across re-renders. If segments are recreated,
  // they get new bitIds and won't match the matrix. This is why useParsedInputs is memoized.
  const { codewords, segments } = useMemo(
    () => {
      // Create a copy of segments to avoid mutating the original array
      // The segment objects themselves are copied, but we'll mutate them to add bitIds
      const segmentsWithBitIds = initialSegments.map(s => ({ ...s }));
      // getCodewords mutates segmentsWithBitIds to add bitIds via getBitsFromSegments
      const codewords = getCodewords(segmentsWithBitIds, version, errorCorrectionLevel);
      // segmentsWithBitIds now have bitIds that match the bits in codewords
      return { codewords, segments: segmentsWithBitIds };
    },
    [initialSegments, version, errorCorrectionLevel]
  );

  // CRITICAL: The matrix must use the same codewords that were created from segments.
  // This ensures matrix modules have bit.id values that match segment.bitIds.
  const { matrix, dataMask } = useMemo(
    () => getMatrix(codewords, selectedDataMask, version, errorCorrectionLevel),
    [errorCorrectionLevel, version, selectedDataMask, codewords]
  );

  return {
    segments,
    codewords,
    version,
    matrix,
    dataMask,
  };
} 