import { encodeSegment, validateLength, createNonByte } from "./utility.js";
import { AlphanumericCharMap, MODE } from "./Constants";

const mode = MODE.Alphanumeric;
const charMap = AlphanumericCharMap;

function encoder(data) {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = charMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value =
      charMap.indexOf(data[0]) * 45 + charMap.indexOf(data[1]);
    length = 11;
  }
  return { value, length };
}

const itrFn = (data) => createNonByte(data, mode, encoder);
export const encodeAlphanumeric = (input) => encodeSegment(input, mode, itrFn);