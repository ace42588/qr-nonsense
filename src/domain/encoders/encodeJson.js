import {
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayoutFromSchema,
} from "./bitFieldUtils";
import { BitPacked, ModHex, NTRU } from "./json";

const defaultFieldMap = {
  transactionKey: "transactionId",
  conferenceKey: "conferenceCode",
  platformKey: "platform",
  itemsKey: "items",
  variantKey: "variant",
  quantityKey: "quantity",
};

const defaultLayout = [
  { label: "platform", bits: 2 },
  { label: "conferenceCode", bits: 8 },
  { label: "transactionId", bits: 22 },
];

const exampleSchema = {
  type: "object",
  properties: {
    platform: {
      type: "integer",
      bits: 2
    },
    conferenceCode: {
      type: "integer",
      bits: 8
    },
    transactionId: {
      type: "integer",
      bits: 20
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variant: {
            type: "integer",
            bits: 16
          },
          quantity: {
            type: "integer",
            bits: 8
          }
        }
      }
    }
  }
}

const alphaNumericSchema = {
  type: "object",
  properties: {
    platform: {
      type: "string",
      bits: 2
    },
    conferenceCode: {
      type: "integer",
      bits: 8
    },
    transactionId: {
      type: "integer",
      bits: 20
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variant: {
            type: "integer",
            bits: 16
          },
          quantity: {
            type: "integer",
            bits: 8
          }
        }
      }
    }
  }
}


const JSON_PARSERS = {
  Alphanumeric: (flatValues, items) => {
    if (!Array.isArray(items)) {
      console.warn("Alphanumeric format requires input.items[]");
      return { data: "", mode: "alphanumeric" };
    }

    const encodedItems = items
      .map(({ variant, quantity }) => `${variant}:${quantity}`)
      .join("/");
    const data = `$1%${flatValues.join("%")}%${encodedItems}/$`;

    return {
      data,
      mode: "alphanumeric",
    };
  },
  PER: (input) => {
    const { layout, totalBits } = generateBitLayout(fields);
  const encodedBytes = encodeFieldsToBytes(layout, values);
    return {
      data: BitPacked.encode(input),
      mode: "byte",
      encoding: "hex",
    };
  },
  "PER-ModHex": (input) => {
    let hex = BitPacked.encode(input);
    if (hex.length % 2 === 1) hex = `0${hex}`;
    const modhex = ModHex.encode(hex);
    return {
      data: modhex,
      mode: "alphanumeric",
      encoding: "modhex",
    };
  },
  "PER-NTRU": (input) => {
    let hex = BitPacked.encode(input);
    const bytes = hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
    const moduli = bytes.map(() => 256);
    const encoded = NTRU.encode(bytes, moduli);
    return {
      data: encoded.join(""),
      mode: "alphanumeric",
      encoding: "ntru",
    };
  },
  None: (input) => ({
    data: JSON.stringify(input),
    mode: "byte",
    encoding: "utf-8",
  }),
};

export function encodeJson({value = {}, schema = {}, encoding = "None"}) {

  if (typeof value !== "object" || value == null) {
    return {
      data: String(value ?? ""),
      mode: "byte",
      encoding: "utf-8",
    };
  }

  const encodeFn = JSON_PARSERS[encoding];
  if (!encodeFn) throw new Error(`Unknown input type: ${encoding}`);

  return encodeFn(value);
}
