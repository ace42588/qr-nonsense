import { Codeword, QRMatrix } from "../../shared/types";

interface MatrixResult {
  matrix: QRMatrix;
  dataMask: number;
}

export function getMatrix(
  codewords: Codeword[],
  dataMask: number,
  version: number,
  errorCorrectionLevel: number
): MatrixResult; 