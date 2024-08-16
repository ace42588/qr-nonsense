import { FormatInfo } from "./encode/FormatInfo";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "./encode/FunctionPatterns";
import { VersionInfo } from "./encode/VersionInfo";
import { VERSIONS } from "./encode/version";
import { ModuleFactory } from "./QRModule";

function setRegion(matrix, left, top, width, height, v) {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      matrix[y][x] = v;
    }
  }
}

export class QRCodeMatrix {
  constructor({ versionDetails, formatInfo }) {
    console.log("QRCodeMatrix", { versionDetails, formatInfo });
    const { errorCorrectionLevel, dataMask } = formatInfo;
    this.versionInfo = new VersionInfo(versionDetails);
    this.alignmentPattern = new AlignmentPattern(versionDetails.versionNumber);
    this.formatInfo = new FormatInfo(formatInfo);
    this.moduleCount = this.versionInfo.numModules;
    this.matrix = Array.from({ length: this.moduleCount }, () =>
      Array(this.moduleCount).fill(false)
    );
    this.moduleFactory = new ModuleFactory(this.formatInfo);
    this.firstUse = true;
    this.history = [];
  }

  placeCodewords(codewords) {
    this.reset();
    const dimension = this.matrix.length;
    const mf = this.moduleFactory;
    mf.setBitSource(codewords.flatMap((c) => c.bits));

    let up = true;
    // write columns in pairs, right to left
    for (let columnIdx = dimension - 1; columnIdx > 0; columnIdx -= 2) {
      // Skip the vertical timing pattern column
      if (columnIdx === 6) columnIdx--;

      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;

        for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
          let x = columnIdx - columnOffset;

          // check for pattern
          if (!this.matrix[y][x]) {
            this.matrix[y][x] = mf.getDataModule({ x, y });
          }
        }
      }
      up = !up; // Change direction
    }
    if (this.firstUse) {
      this.originalMatrix = this.matrix;
      this.history.push(this.matrix);
      this.firstUse = false;
    }
    //console.log("placeCodewords", this.matrix);
  }

  placeFunctionPatterns() {
    // Draw the finder patterns
    FinderPattern.populate(this.matrix);

    // Draw the timing patterns
    TimingPattern.populate(this.matrix);

    // Draw the alignment patterns for version 2 and above
    this.alignmentPattern.populate(this.matrix);

    // Draw format information
    this.formatInfo.populate(this.matrix);

    // Draw version information for versions 7 and above
    this.versionInfo.populate(this.matrix);
  }

  reset() {
    if (!this.firstUse) {
      this.history.push(this.matrix);
    }
    this.matrix = Array.from({ length: this.moduleCount }, () =>
      Array(this.moduleCount).fill(false)
    );
    this.placeFunctionPatterns();
  }
}
