import { encodeSegment, validateLength, createNonByte } from "./utils.js";

const mode = {
  name: "eci",
  bits: 0x7,
  thresholds: [
    { max: 6, length: 8 },
    { max: 127, length: 16 },
    { max: Infinity, length: 16 },
  ],
  groupingRegex: /^\d+$/g,
};

/**
 * Encodes ECI (Extended Channel Interpretation) assignment number
 * According to QR code specification:
 * - Values 1-6: encoded in 8 bits
 * - Values 7-127: encoded in 16 bits
 * - Values 128-999: encoded in 16 bits
 */
function encoder(data) {
  validateLength(data, 1, 3, "ECI");
  const value = parseInt(data, 10);
  
  if (value < 1 || value > 999) {
    throw new Error(`ECI assignment number must be between 1 and 999, got ${value}`);
  }
  
  // Determine bit length based on value range
  let length;
  if (value >= 1 && value <= 6) {
    length = 8;
  } else if (value >= 7 && value <= 127) {
    length = 16;
  } else {
    // 128-999
    length = 16;
  }
  
  return {
    value,
    length,
  };
}

const itrFn = (data) => createNonByte(data, mode, encoder);
export const encodeEci = (input) => encodeSegment(input, mode, itrFn);