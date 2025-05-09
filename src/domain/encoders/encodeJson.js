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

const exampleSchema = {
  type: "object",
  properties: {
    platform: {
      type: "integer",
      bits: 2,
    },
    conferenceCode: {
      type: "integer",
      bits: 8,
    },
    transactionId: {
      type: "integer",
      bits: 20,
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variant: {
            type: "integer",
            bits: 16,
          },
          quantity: {
            type: "integer",
            bits: 8,
          },
        },
      },
    },
  },
};

const existingSchema = {
  type: "object",
  properties: {
    p: {
      type: "integer",
    },
    cc: {
      type: "integer",
    },
    txn: {
      type: "integer",
    },
    i: {
      type: "array",
      items: {
        type: "object",
        properties: {
          v: {
            type: "integer",
          },
          q: {
            type: "integer",
          },
        },
      },
    },
  },
};

const alphaNumericSchema = {
  type: "object",
  properties: {
    encapsulator: "$",
    format: {
      type: "integer",
    },
    platform: {
      type: "string",
    },
    conferenceCode: {
      type: "integer",
    },
    transactionId: {
      type: "integer",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variant: {
            type: "integer",
          },
          quantity: {
            type: "integer",
          },
          separator: ":",
        },
      },
      separator: "/",
    },
    separator: "%",
  },
};

// Extracts top-level integers and the first array of objects (if present)
function separateSchemaParts(schema) {
  const rootFields = {};
  let arrayField = null;
  let arraySchema = null;

  for (const [key, prop] of Object.entries(schema.properties || {})) {
    if (prop.type === "integer") {
      rootFields[key] = prop;
    } else if (
      prop.type === "array" &&
      prop.items?.type === "object" &&
      !arrayField
    ) {
      arrayField = key;
      arraySchema = prop.items;
    }
  }

  return {
    rootSchema: { type: "object", properties: rootFields },
    arrayField,
    arraySchema,
  };
}

function encodeToBytes(obj, schema) {
  const { rootSchema, arrayField, arraySchema } = separateSchemaParts(schema);

  const rootLayout = generateBitLayoutFromSchema(rootSchema);
  const rootBytes = encodeFieldsToBytes(rootLayout, obj);

  let itemBytes = [];

  if (arrayField && Array.isArray(obj[arrayField])) {
    const itemLayout = generateBitLayoutFromSchema(arraySchema);
    itemBytes = obj[arrayField].flatMap((item) =>
      Array.from(encodeFieldsToBytes(itemLayout, item))
    );
  }

  const combined = new Uint8Array(rootBytes.length + itemBytes.length);
  combined.set(rootBytes, 0);
  combined.set(itemBytes, rootBytes.length);
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
  PER: (obj, schema) => ({
    mode: "byte",
    encoding: "hex",
    data: bytesToHex(encodeToBytes(obj, schema)),
  }),
  "PER-ModHex": (obj, schema) => {
    const hex = encodeToBytes(obj, schema);
    return {
      data: ModHex.encode(hex),
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

export function encodeJson({ obj = {}, schema = {}, encoding = "None" }) {
  if (typeof obj !== "object" || obj == null) {
    return {
      data: String(obj ?? ""),
      mode: "byte",
      encoding: "utf-8",
    };
  }

  const encodeFn = JSON_PARSERS[encoding];
  if (!encodeFn) throw new Error(`Unknown input type: ${encoding}`);

  return encodeFn(obj);
}
