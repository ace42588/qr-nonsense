import { useMemo } from "react";
import { QRMatrix } from "@/domain/shared/types";
import { QArtResult } from "@/domain/qart";

interface UseQRMatrixParams {
  qartResult: QArtResult | null;
  contextMatrix: QRMatrix | null;
}

/**
 * Hook that selects the appropriate QR matrix from QArt result or context.
 * Prioritizes QArt result matrix when available, falls back to context matrix.
 */
export function useQRMatrix({
  qartResult,
  contextMatrix,
}: UseQRMatrixParams): QRMatrix | null {
  const matrix = useMemo(() => {
    // If we have a QArt result, always use its matrix (never fall back to contextMatrix)
    // This ensures qartResult is completely isolated and won't be affected by context changes
    if (qartResult?.matrix) {
      return qartResult.matrix;
    }
    // Only use contextMatrix when we don't have a QArt result
    return contextMatrix || null;
  }, [qartResult?.matrix, contextMatrix]);

  return matrix;
}

