// domain/encoders/encodeBitField.js
import {
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayout,
} from "./bitFieldUtils";
import {parseInput} from "./parseInput";

export function encodeBitField(input) {
  const { fields = [], values = {} } = input;
  const { layout, totalBits } = generateBitLayout(fields);
  const encodedBytes = encodeFieldsToBytes(layout, values);
  return parseInput({
    ...input,
    mode: "byte",
    encoding: "utf-8",
    data: bytesToHex(encodedBytes),
  });
}
