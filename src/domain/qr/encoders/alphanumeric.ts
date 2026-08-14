import { encodeSegment, validateLength, createNonByte } from "./utils";
import { logger as log } from "@/adapters/logger";

const mode = {
  name: "alphanumeric",
  bits: 0x2,
  thresholds: [
    { max: 45, length: 9 },
    { max: 1225, length: 11 },
    { max: Infinity, length: 13 },
  ],
  groupingRegex: /[0-9A-Z $%*+\-./:]{1,2}/g,
};
export const ALPHANUMERIC_CHARSET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ALPHANUMERIC_CHAR_SET = new Set(ALPHANUMERIC_CHARSET);

export function isAlphanumericChar(char: string): boolean {
  return ALPHANUMERIC_CHAR_SET.has(char);
}

const charMap = ALPHANUMERIC_CHARSET;

function encoder(data: string): { value: number; length: number } {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = charMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value = charMap.indexOf(data[0]) * 45 + charMap.indexOf(data[1]);
    length = 11;
  }
  log.debug("alphanumeric:encoder", { data, value, length });
  return { value, length };
}

const itrFn = (data: string) => createNonByte(data, mode, encoder);
export const encodeAlphanumeric = (input: string) =>
  encodeSegment(input ? input.toUpperCase() : "", mode, itrFn);

