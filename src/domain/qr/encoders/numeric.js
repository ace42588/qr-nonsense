import { encodeSegment, validateLength, createNonByte } from "./utils.js";

const mode = {
  name: "numeric",
  bits: 0x1,
  thresholds: [
    { max: 10, length: 10 },
    { max: 1000, length: 12 },
    { max: Infinity, length: 14 },
  ],
  groupingRegex: /\d{1,3}/g,
};

function encoder(data) {
  validateLength(data, 1, 3, "Numeric");
  const value = parseInt(data, 10);
  const length = value.toString().length * 3 + 1;
  return {
    value,
    length,
  };
}

const itrFn = (data) => createNonByte(data, mode, encoder);
export const encodeNumeric = (input) => encodeSegment(input, mode, itrFn);
