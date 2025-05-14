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