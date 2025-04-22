import { encodeSegment, validateLength, createNonByte } from "./utility.js";
import { AlphaNumCharMap, MODE } from "./Constants";

const mode = MODE.Alphanumeric;

function encoder(data) {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = AlphaNumCharMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value =
      AlphaNumCharMap.indexOf(data[0]) * 45 + AlphaNumCharMap.indexOf(data[1]);
    length = 11;
  }
  return { value, length };
}

const itrFn = (data) => createNonByte(data, mode, encoder);
const encodeAlphanumeric = (input) => encodeSegment(input, mode, itrFn);