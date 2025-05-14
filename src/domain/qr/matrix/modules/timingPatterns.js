import { makeNonDataModule } from "./utils";

const source = { name: "TimingPattern" };

export function addTimingPatterns(matrix) {
  for (let i = 8; i < matrix.length - 8; i++) {
    const value = i % 2 === 0 ? 1 : 0;
    matrix[6][i] = makeNonDataModule(value, source, i, 6);
    matrix[i][6] = makeNonDataModule(value, source, 6, i);
  }
  return matrix;
}