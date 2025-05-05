import { encodeSegment, validateLength, createNonByte } from "./utility.js";
const mode = {
    name: "eci",
    bits: 0x7,
    thresholds: [
      { max: 256, length: 8 },
      { max: Infinity, length: 16 },
    ]
  }

// TODO: Update for ECI
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
export const encodeEci = (input) => encodeSegment(input, mode, itrFn);