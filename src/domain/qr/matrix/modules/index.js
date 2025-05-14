import {getBitsFromFormatInfo, makeNonDataModule} from "./utils";
import {addFinderPatterns} from "./finderPattern";
import {addSeparators} from "./separators";
import {addAlignmentPatterns} from "./alignmentPatterns";

export function addFormatInfoModules(matrix, errorCorrectionLevel, dataMask) {
  const source = { name: "FormatInfo" };
  const size = matrix.length;
  const formatInfo = getBitsFromFormatInfo(errorCorrectionLevel, dataMask);
  source.value = formatInfo;
  const bits = formatInfo.toString(2);
  const values = `${bits}`;

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
  matrix[size - 8][8] = makeNonDataModule(1, {...source, value: "dark module"}, 8, size - 8);
}

export function addNonDataModules(
  matrix,
  errorCorrectionLevel,
  version,
  dataMask
) {
  const size = matrix.length;


  function addTimingPatterns() {
    const source = { name: "TimingPattern" };
    for (let i = 8; i < size - 8; i++) {
      const value = i % 2 === 0 ? 1 : 0;
      matrix[6][i] = makeNonDataModule(value, source, i, 6);
      matrix[i][6] = makeNonDataModule(value, source, 6, i);
    }
  }

  function addVersionInfo() {
    function getVersionString() {
      const versionBits = VERSION_INFO[version].toString(2).padStart(6, "0");
      const paddedVersionBits = versionBits.padEnd(18, "0");

      const errorCorrectionBits = computeBCH(paddedVersionBits, 12);
      return (versionBits + errorCorrectionBits).padStart(18, "0");
    }
    if (version < 7) return;
    const source = { name: "VersionInfo" };
    const versionString = getVersionString();
    source.value = versionString;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j];
        // Bottom-left version information
        matrix[size - 11 + j][i] = makeNonDataModule(
          value,
          source,
          size - 11 + j,
          i
        );
        // Top-right version information
        matrix[i][size - 11 + j] = makeNonDataModule(
          value,
          source,
          i,
          size - 11 + j
        );
      }
    }
  }

  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns();
  addTimingPatterns();
  addFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
  addVersionInfo();

  return matrix;
}