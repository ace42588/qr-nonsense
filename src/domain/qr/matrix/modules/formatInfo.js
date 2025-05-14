import { FORMAT_INFO_TABLE } from "../../constants";
import { makeNonDataModule } from "./utils";

const source = {
  name: "FormatInfo",
  type: "placeholder",
  value: 0x4000,
};

function getBitsFromFormatInfo(ecLevel, mask = -1) {
  if (mask === -1) return 0x4000;
  const info = FORMAT_INFO_TABLE.filter(
    ({ formatInfo: { errorCorrectionLevel, dataMask } }) =>
      errorCorrectionLevel == ecLevel && mask == dataMask
  )[0];
  if (!info || !info.bits) throw new Error("Format information not found");
  return info.bits;
}

function placeModules(matrix, formatInfo = 0x4000) {
  const size = matrix.length;
  const values = formatInfo.toString(2);
  //console.debug("placeModules", {formatInfo, values});
  // Horizontal
  [
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
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(values[idx], source, x, y))
  );
  // Vertical
  [
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
  ].forEach(
    ({ x, y }, idx) =>
      (matrix[y][x] = makeNonDataModule(values[idx], source, x, y))
  );

  // Add the dark module
  matrix[size - 8][8] = makeNonDataModule(
    1,
    { ...source, value: "dark module" },
    8,
    size - 8
  );
  return matrix;
}

export function addFormatInfoModules(matrix, errorCorrectionLevel, dataMask) {
  const formatInfo = getBitsFromFormatInfo(errorCorrectionLevel, dataMask);
  console.debug("addFormatInfoModules", {
    errorCorrectionLevel,
    dataMask,
    formatInfo,
  });
  placeModules(matrix, formatInfo);
  return matrix;
}
