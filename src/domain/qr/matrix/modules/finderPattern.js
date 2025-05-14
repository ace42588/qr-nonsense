import { FINDER_PATTERN } from "../constants";
import { makeNonDataModule } from "./utils";

const source = { name: "FinderPattern" };

export function addFinderPatterns(matrix) {
  console.debug("addFinderPatterns", {matrix});
  const size = matrix.length;
  
  function addPattern(startX, startY) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const value = FINDER_PATTERN[y][x];
        matrix[startY + y][startX + x] = makeNonDataModule(
          value,
          source,
          startX + x,
          startY + y
        );
      }
    }
  }

  addPattern(0, 0);
  addPattern(size - 7, 0);
  addPattern(0, size - 7);
  
  return matrix;
}