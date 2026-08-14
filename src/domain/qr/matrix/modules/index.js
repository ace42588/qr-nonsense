import { addFinderPatterns } from "./finderPattern";
import { addSeparators } from "./separators";
import { addAlignmentPatterns } from "./alignmentPatterns";
import { addTimingPatterns } from "./timingPatterns";
import { addFormatInfoPlaceholders } from "./formatInfo";
import { addVersionInfoPlaceholders } from "./versionInfo";

export { makeModule } from "./utils";
export { updateFormatInfoModules } from "./formatInfo";
export { addVersionInfo } from "./versionInfo";

export function addPatterns(matrix) {
  // currently mutates the existing matrix, may change in the future;
  addFinderPatterns(matrix);
  addSeparators(matrix);
  addAlignmentPatterns(matrix);
  addTimingPatterns(matrix);
  addFormatInfoPlaceholders(matrix); // add placeholder
  addVersionInfoPlaceholders(matrix); // add version info placeholders (values set after masking)
  return matrix;
}
