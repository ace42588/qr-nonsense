import { getBitsFromFormatInfo, makeModule, makeNonDataModule } from "./utils";
import { addFinderPatterns } from "./finderPattern";
import { addSeparators } from "./separators";
import { addAlignmentPatterns } from "./alignmentPatterns";
import { addTimingPatterns } from "./timingPatterns";
import { addFormatInfoModules } from "./formatInfo";
import { addVersionInfo } from "./versionInfo";


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