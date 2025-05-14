import { addFinderPatterns } from "./finderPattern";
import { addSeparators } from "./separators";
import { addAlignmentPatterns } from "./alignmentPatterns";
import { addTimingPatterns } from "./timingPatterns";
import { addFormatInfoModules } from "./formatInfo";
import { addVersionInfo } from "./versionInfo";

export { makeModule } from "./utils";
export { addFormatInfoModules } from "./formatInfo";
export { addVersionInfo } from "./versionInfo";

export function addPatterns(matrix) {
  // currently mutates the existing matrix, may change in the future;
  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns(matrix);
  addTimingPatterns(matrix);
  addFormatInfoModules(matrix); // add placeholder
  addVersionInfo(matrix);
  return matrix;
}
