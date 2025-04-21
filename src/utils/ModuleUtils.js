import {
  ALIGNMENT_PATTERN,
  FINDER_PATTERN,
  FORMAT_INFO_TABLE,
  VERSION_INFO,
} from "../Constants";

export function makeModule({ bit, x, y, isMasked }) {
  //console.debug("makeModule", arguments);
  let { value } = bit;
  value = !!value;
  const isDark = isMasked ? !value : value;
  return {
    bit,
    x,
    y,
    isDark,
    isMasked,
    isHighlighted: false,
  };
}

function makeNonDataModule(value, source, x, y) {
  value = parseInt(value);
  const bit = {
    value,
    source,
  };
  const module = makeModule({ bit, x, y, isMasked: false });
  module;
  module.nonData = true;
  return { ...module, nonData: true, source };
}

function getAlignmentPatternPositions(version) {
  if (version === 1) return [];
  const positions = [6];
  const numPositions = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 17 - 13) / (numPositions - 1));
  for (
    let pos = version * 4 + 10 - step * (numPositions - 2);
    pos >= 6;
    pos -= step
  ) {
    positions.push(pos);
  }
  positions.push(version * 4 + 10);
  return positions;
}

function getBitsFromFormatInfo(ecLevel, mask) {
  if (mask === -1) return 0x77c4;
  for (const entry of FORMAT_INFO_TABLE) {
    if (
      entry.formatInfo.errorCorrectionLevel === ecLevel &&
      entry.formatInfo.dataMask === mask
    ) {
      return entry.bits;
    }
  }
  throw new Error("Format information not found");
}

function computeBCH(bits, length) {
  const generator = 0b1111100100101; // Generator polynomial for BCH(18, 6)
  const maxIter = 9;
  let iters = 0;
  let bitsInt = parseInt(bits, 2);
  bits = bitsInt.toString(2);

  while (bits.length > length && iters < maxIter) {
    const padLength = bits.length - (length + 1);
    const genStep = generator << padLength;
    bitsInt ^= genStep;
    bits = bitsInt.toString(2);
    iters++;
  }

  return bits.padStart(length, "0");
}

export function addFormatInfoModules(matrix, errorCorrectionLevel, dataMask) {
  const source = { name: "FormatInfo" };
  const size = matrix.length;
  const formatInfo = getBitsFromFormatInfo(errorCorrectionLevel, dataMask);
  source.value = formatInfo;
  console.debug("addFormatInfoModules", {formatInfo});
  const bits = formatInfo.toString(2);
  const values = `${bits}${bits}`;
  console.debug("addFormatInfoModules", {values});
  const horizontal = [
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
    ];
  const vertical = [
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
  ];
  // Tile the format bits
  for (let i = 0; i < positions.length; i++) {
    const { x, y } = positions[i];
    matrix[y][x] = makeNonDataModule(values[i], source, x, y);
  }

  // Add the dark module
  matrix[size - 8][8] = makeNonDataModule(1, "Dark Module", 8, size - 8);
}

export function addNonDataModules(
  matrix,
  errorCorrectionLevel,
  version,
  dataMask
) {
  const size = matrix.length;

  function addAlignmentPatterns() {
    const source = { name: "AlignmentPattern" };
    if (version === 1) return [];

    function shouldDrawAlignmentPattern(x, y) {
      const finderPatternPositions = [
        { x: 0, y: 0 },
        { x: size - 7, y: 0 },
        { x: 0, y: size - 7 },
      ];

      for (const pos of finderPatternPositions) {
        if (Math.abs(pos.x - x) < 9 && Math.abs(pos.y - y) < 9) {
          return false;
        }
      }
      return true;
    }

    function drawAlignmentPattern(centerX, centerY) {
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const value = ALIGNMENT_PATTERN[y][x];
          matrix[centerY - 2 + y][centerX - 2 + x] = makeNonDataModule(
            value,
            source,
            centerX - 2 + x,
            centerY - 2 + y
          );
        }
      }
    }

    const positions = getAlignmentPatternPositions(version);

    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (shouldDrawAlignmentPattern(positions[i], positions[j])) {
          drawAlignmentPattern(positions[i], positions[j]);
        }
      }
    }
  }

  function addFinderPatterns() {
    const source = { name: "FinderPattern" };
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
  }

  function addSeparators() {
    const source = { name: "Separator" };

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
  }

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

  addFinderPatterns();
  addSeparators();
  addAlignmentPatterns();
  addTimingPatterns();
  addFormatInfoModules(matrix, errorCorrectionLevel, dataMask);
  addVersionInfo();

  return matrix;
}
