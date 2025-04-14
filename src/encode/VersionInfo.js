import { VersionBit } from "./TaggedBitstream";
import { VERSION_INFO } from "../Constants";

export class VersionInfo {
  constructor(version) {
    if (typeof version === "object") {
      this.version = version;
    } else {
      this.version = VERSION_INFO[version];
    }
    const { versionNumber, infoBits } = this.version;
    this.versionNumber = version;
    this.infoBits = infoBits;
  }

  populate(matrix) {
    if (this.versionNumber < 7) return;
    const source = "version";
    const posVal = "black";
    const negVal = "white";
    const versionString = this.getVersionString();
    const size = matrix.length;

    // Bottom-left version information
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j] === "1" ? posVal : negVal;
        matrix[size - 11 + j][i] = new VersionBit({ bit: value });
      }
    }

    // Top-right version information
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const value = versionString[i * 3 + j] === "1" ? posVal : negVal;
        matrix[i][size - 11 + j] = new VersionBit({ bit: value });
      }
    }
  }

  get numModules() {
    return this.versionNumber * 4 + 17;
  }

  getVersionString() {
    const versionBits = this.infoBits.toString(2).padStart(6, "0");
    const paddedVersionBits = versionBits.padEnd(18, "0");
    const generator = 0b1111100100101; // Generator polynomial for BCH(18, 6)

    const errorCorrectionBits = VersionInfo.computeBCH(
      paddedVersionBits,
      generator,
      12
    );
    return (versionBits + errorCorrectionBits).padStart(18, "0");
  }

  static computeBCH(bits, generator, length) {
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
}
