// domain/encoders/encodeBitField.js
import {
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayout,
} from "./bitFieldUtils";
import { parseInput } from "./parseInput";

export function encodeBitField(input) {
  console.debug("encodeBitField", {input});
  const { fields = [], values = {} } = input;
  const { layout, totalBits } = generateBitLayout(fields);
  const encodedBytes = encodeFieldsToBytes(layout, values);
  return {
    layout,
    values,
    totalBits,
    encodedBytes,
    mode: "byte",
    encoding: "utf-8",
    data: bytesToHex(encodedBytes),
  };
}
