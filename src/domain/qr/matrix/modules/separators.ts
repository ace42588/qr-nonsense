import { Source } from "@/types";
import { QRMatrix } from "@/types";
import { makeNonDataModule } from "./utils";

const source: Source = { id: crypto.randomUUID(), name: "Separator" };

export function addSeparators(matrix: QRMatrix): QRMatrix {
  const size = matrix.length;

  for (let i = 0; i < 8; i++) {
    // Top-left separator
    matrix[i][7] = makeNonDataModule(0, source, 7, i);
    matrix[7][i] = makeNonDataModule(0, source, i, 7);
    // Top-right separator
    matrix[i][size - 8] = makeNonDataModule(0, source, size - 8, i);
    matrix[7][size - 1 - i] = makeNonDataModule(0, source, size - 1 - i, 7);
    // Bottom-left separator
    matrix[size - 1 - i][7] = makeNonDataModule(0, source, 7, size - 1 - i);
    matrix[size - 8][i] = makeNonDataModule(0, source, i, size - 8);
  }
  return matrix;
} 