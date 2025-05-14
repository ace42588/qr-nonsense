import { addFinderPatterns } from "./finderPattern";
import { addSeparators } from "./separators";
import { addAlignmentPatterns } from "./alignmentPatterns";
import { addTimingPatterns } from "./timingPatterns";

export { makeModule } from "./utils";
export { addFormatInfoModules } from "./formatInfo";
export { addVersionInfo } from "./versionInfo";

export function addPatterns(matrix) {
  // currently mutates the existing matrix, may change in the future;
  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns(matrix);
  addTimingPatterns(matrix);
  return matrix;
}
