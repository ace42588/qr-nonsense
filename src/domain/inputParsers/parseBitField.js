// domain/inputParsers/parseBitField.js
import { bytesToHex } from "../encoders/utils";
import {
  encodeFieldsToBytes,
  generateBitLayout,
} from "./utils/bitFieldUtils";

export function parseBitField(input) {
  console.debug("parseBitField", {input});
  const { fields, values } = input;
  if (!fields || !values) return input;
  
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
