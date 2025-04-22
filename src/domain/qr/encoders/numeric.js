import { encodeSegment, validateLength, createNonByte } from "./utility.js";
import { MODE } from "./Constants";

const mode = MODE.Numeric;

function encoder(data) {
  validateLength(data, 1, 3, "Numeric");
  const value = parseInt(data, 10);
  const length = value.toString().length * 3 + 1;
  return {
    value,
    length,
  };
}

const itrFn = (data, mode) => createNonByte(data, mode, encoder);
const encodeNumeric = (input) => encodeSegment(input, mode, itrFn);
