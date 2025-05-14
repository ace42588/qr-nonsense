import {
  ALIGNMENT_PATTERN,
  FINDER_PATTERN,
  FORMAT_INFO_TABLE,
  VERSION_INFO,
} from "./constants";

export function makeModule({ bit, x, y, isMasked }) {
  //console.debug("makeModule", arguments);
  let { value } = bit;
  value = !!value;
  const isDark = isMasked ? !value : value;
  return {
    id: `mod-${x}-${y}`,
    bitId: bit.id,
    bit,
    x,
    y,
    isDark,
    isMasked,
    type: "module",
  };
}

export function makeNonDataModule(value, source, x, y) {
  value = parseInt(value);
  const bit = {
    value,
    id: source.name,
    source,
  };
  const module = makeModule({ bit, x, y, isMasked: false });
  return { ...module, nonData: true, source };
}

export function getBitsFromFormatInfo(ecLevel, mask = -1) {
  if (mask === -1) return 0x4000;
  const info = FORMAT_INFO_TABLE.filter(
    ({ formatInfo: { errorCorrectionLevel, dataMask } }) =>
      errorCorrectionLevel == ecLevel && mask == dataMask
  )[0];
  if (!info || !info.bits) throw new Error("Format information not found");
  return info.bits;
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

function addTimingPatterns(matrix) {
  const source = { name: "TimingPattern" };
  for (let i = 8; i < matrix.length - 8; i++) {
    const value = i % 2 === 0 ? 1 : 0;
    matrix[6][i] = makeNonDataModule(value, source, i, 6);
    matrix[i][6] = makeNonDataModule(value, source, 6, i);
  }
}

function addVersionInfo(version, matrix) {
  const size = matrix.length;
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
