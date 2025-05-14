import { getBitsFromFormatInfo, makeModule, makeNonDataModule } from "./utils";
import { addFinderPatterns } from "./finderPattern";
import { addSeparators } from "./separators";
import { addAlignmentPatterns } from "./alignmentPatterns";
import { addTimingPatterns } from "./timingPatterns";
import { addVersionInfo } from "./versionInfo";

export function addFormatInfoModules(matrix, errorCorrectionLevel, dataMask) {
  const source = { name: "FormatInfo" };
  const formatInfo = getBitsFromFormatInfo(errorCorrectionLevel, dataMask);
  source.value = formatInfo;
  const bits = formatInfo.toString(2);
  const values = `${bits}`;

  const size = matrix.length;
  // Horizontal
  [
    { x: 0, y: 8 },
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    { x: 7, y: 8 },
    { x: size - 8, y: 8 },
    { x: size - 7, y: 8 },
    { x: size - 6, y: 8 },
    { x: size - 5, y: 8 },
    { x: size - 4, y: 8 },
    { x: size - 3, y: 8 },
    { x: size - 2, y: 8 },
    { x: size - 1, y: 8 },
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(values[idx], source, x, y))
  );
  // Vertical
  [
    { x: 8, y: size - 1 },
    { x: 8, y: size - 2 },
    { x: 8, y: size - 3 },
    { x: 8, y: size - 4 },
    { x: 8, y: size - 5 },
    { x: 8, y: size - 6 },
    { x: 8, y: size - 7 },
    { x: 8, y: 8 },
    { x: 8, y: 7 },
    { x: 8, y: 5 },
    { x: 8, y: 4 },
    { x: 8, y: 3 },
    { x: 8, y: 2 },
    { x: 8, y: 1 },
    { x: 8, y: 0 },
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(values[idx], source, x, y))
  );

  // Add the dark module
  matrix[size - 8][8] = makeNonDataModule(
    1,
    { ...source, value: "dark module" },
    8,
    size - 8
  );
}

export function addNonDataModules(
  matrix,
  errorCorrectionLevel,
  dataMask
) {
  
  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns(matrix);
  addTimingPatterns(matrix);
  addFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
  addVersionInfo(matrix);

  return matrix;
}

export const getModule = makeModule;