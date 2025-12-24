import { Bit, Source } from "../../shared/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { logger as log } from "@/adapters/logger";
import { generateId } from "../utils/id";

function getBit(value: number, sourceId: string, sourceType?: string): Bit {
  if (!sourceId) throw new Error("Missing source ID");
  return {
    type: sourceType,
    value,
    id: generateId(),
    sourceId,
  };
}

export function getBits(value: string | number, length: number, source: Source): Bit[] {
  //log.debug("getBits", { value, length, source });
  if (!source) throw new Error("Missing source");
  /*
  let binaryString = value;
  if (typeof value === 'number' && length) {
    binaryString = value.toString(2).padStart(length, "0");
  }
  */
  switch (typeof value) {
    case "string": {
      const re = /[01]{2,}/gm;
      if (!re.test(value))
        throw new Error(
          `Invalid string value for getBits(): ${JSON.stringify(value)}`
        );
      const bits = [...value].map((bit) =>
        getBit(parseInt(bit), source.id, source.type)
      );
      return bits;
    }
    case "number": {
      const bits = Array.from({ length }).map((_, idx) =>
        getBit((value >> (length - 1 - idx)) & 1, source.id, source.type)
      );
      return bits;
    }
    default: {
      throw new Error(`Invalid value for getBits(): ${JSON.stringify(value)}`);
    }
  }
}

export function bitsToByte(bits: Bit[]): number {
  if (bits.length !== 8) throw new Error("Invalid bits!" + JSON.stringify(bits));
  return bits.reduce((byte, { value }) => (byte << 1) | value, 0);
} 