import { VERSION_INFO } from "./constants";
import { makeNonDataModule } from "./utils";

const source = { name: "VersionInfo" };

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

function getVersionString(version) {
    const versionBits = VERSION_INFO[version].toString(2).padStart(6, "0");
    const paddedVersionBits = versionBits.padEnd(18, "0");

    const errorCorrectionBits = computeBCH(paddedVersionBits, 12);
    return (versionBits + errorCorrectionBits).padStart(18, "0");
  }

export function addVersionInfo(matrix) {
  const size = matrix.length;
  const version = (size - 17) / 4;

  if (version < 7) return;

  const versionString = getVersionString(version);
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
  return matrix;
}
