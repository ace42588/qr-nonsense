import { bytesToHex } from "../encoders/utils";
import {
  encodeFieldsToBytes,
  generateBitLayoutFromSchema,
} from "./utils/bitFieldUtils";
import { ModHex, NTRU } from "../encoders";

const bitSchema = {
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
          terminator: "/",
        },
      },
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
  return combined;
}

function encodeToHex(obj, schema) {
  const bytes = encodeToBytes(obj, schema);
  return bytesToHex(bytes);
}

function encodeToAlphanumeric(obj, schema) {
  const { rootSchema, arrayField, arraySchema } = separateSchemaParts(schema);
  const { separator = "", encapsulator = "", ...flatValues } = rootSchema;
  let encodedItems;
  if (arrayField && Array.isArray(obj[arrayField])) {
    const {
      separator = "",
      terminator = "",
      ...props
    } = arraySchema.properties;
    const propKeys = Object.keys(props);
    const first = propKeys.shift();
    encodedItems = obj[arrayField]
      .map((item) => {
        return propKeys.reduce(
          (str, k) => `${separator}${item[k]}${terminator}`,
          item[first]
        );
      })
      .join("");
  }
  return `${encapsulator}${flatValues.join(
    separator
  )}${separator}${encodedItems}${encapsulator}`;
}

const JSON_PARSERS = {
  Alphanumeric: (obj, schema) => ({
    data: encodeToAlphanumeric(obj, schema),
    mode: "alphanumeric",
  }),
  PER: (obj, schema) => ({
    mode: "byte",
    encoding: "hex",
    data: encodeToHex(obj, schema),
  }),
  "PER-ModHex": (obj, schema) => ({
    data: ModHex.encode(encodeToBytes(obj, schema)),
    mode: "alphanumeric",
    encoding: "modhex",
  }),
  "PER-NTRU": (obj, schema) => ({
    data: NTRU.encode(encodeToBytes(obj, schema)),
    mode: "numeric",
    encoding: "ntru",
  }),
  None: (obj, schema) => ({
    data: JSON.stringify(obj),
    mode: "byte",
    encoding: "utf-8",
  }),
};

export function parseJson(input) {
  const { obj, schema, encoding } = input;
  console.debug("parseJson", { obj, schema, encoding });
  if (!obj || !schema) return input;

  if (typeof obj !== "object" || obj == null) {
    return {
      data: String(obj ?? ""),
      mode: "byte",
      encoding: "utf-8",
    };
  }

  const encodeFn = JSON_PARSERS[encoding];
  if (!encodeFn) throw new Error(`Unknown input type: ${encoding}`);

  return encodeFn(obj, schema);
}
