import { encodeSegment, validateLength, createNonByte } from "./utils";
import { logger as log } from "@/adapters/logger";

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

function encoder(data: string): { value: number; length: number } {
  validateLength(data, 1, 3, "Numeric");
  const value = parseInt(data, 10);
  const length = data.length * 3 + 1;
  log.debug("numeric encoder", {data, value, length});
  return {
    value,
    length,
  };
}

const itrFn = (data: string) => createNonByte(data, mode, encoder);
export const encodeNumeric = (input: string) => encodeSegment(input || "", mode, itrFn);

