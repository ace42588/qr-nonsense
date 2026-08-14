import { VERSION_INFO } from "../constants";
import { makeNonDataModule } from "./utils";

const source = { name: "VersionInfo" };

function getVersionString(version) {
  const infoBits = VERSION_INFO[version].infoBits;
  return infoBits.toString(2).padStart(18, "0");
}

// Add version info placeholders (reserve positions, values set later)
export function addVersionInfoPlaceholders(matrix) {
  const size = matrix.length;
  const version = (size - 17) / 4;

  if (version < 7) return;

  // Reserve positions with placeholder modules (non-data, value doesn't matter yet)
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      // Bottom-left version information (columns 0-5, rows size-11+j)
      const bottomLeftX = i;
      const bottomLeftY = size - 11 + j;
      if (!matrix[bottomLeftY][bottomLeftX]) {
        matrix[bottomLeftY][bottomLeftX] = makeNonDataModule(0, source, bottomLeftX, bottomLeftY);
      }
      // Top-right version information (columns size-11+j, rows 0-5)
      const topRightX = size - 11 + j;
      const topRightY = i;
      if (!matrix[topRightY][topRightX]) {
        matrix[topRightY][topRightX] = makeNonDataModule(0, source, topRightX, topRightY);
      }
    }
  }
  return matrix;
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
      // Bottom-left version information (rows size-11+j to size-9+j, columns 0-5)
      // QR spec: bottom-left is in the bottom-left corner area
      const bottomLeftX = i;
      const bottomLeftY = size - 11 + j;
      const bottomLeftModule = makeNonDataModule(value, source, bottomLeftX, bottomLeftY);
      matrix[bottomLeftY][bottomLeftX] = bottomLeftModule;
      // Top-right version information (rows 0-5, columns size-11+j to size-9+j)
      // QR spec: top-right is in the top-right corner area
      const topRightX = size - 11 + j;
      const topRightY = i;
      const topRightModule = makeNonDataModule(value, source, topRightX, topRightY);
      matrix[topRightY][topRightX] = topRightModule;
    }
  }
  return matrix;
}
