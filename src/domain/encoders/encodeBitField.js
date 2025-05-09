import {
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayout,
} from "./bitFieldUtils";
import parseInput from "./parseInput";

export function encodeBitField({ fields = [], values = {} }) {
  const { layout, totalBits } = generateBitLayout(fields);
  const encodedBytes = encodeFieldsToBytes(layout, values);
  return parseInput({
    mode: "byte",
    encoding: "utf-8",
    data: bytesToHex(encodedBytes),
  });
}
