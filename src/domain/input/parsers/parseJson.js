import { bytesToHex } from "../../encoders/utils";
import {
  encodeFieldsToBytes,
  generateBitLayoutFromSchema,
} from "./utils/bitFieldUtils";
import { ModHex, NTRU } from "../../encoders";

const specialTypes = ["encapsulator", "separator", "terminator"];

// Extracts top-level integers and the first array of objects (if present)
function separateSchemaParts(schema) {
  const flatTypes = ["integer", "string", "number", "boolean"];
  const rootFields = {};
  let arrayField = null;
  let arraySchema = null;

  for (const [key, prop] of Object.entries(schema.properties || {})) {
    //console.debug("separateSchemaParts", { key, prop });
    if (flatTypes.includes(prop.type)) {
      rootFields[key] = prop;
    } else if (
      prop.type === "array" &&
      prop.items?.type === "object" &&
      !arrayField
    ) {
      arrayField = key;
      arraySchema = prop.items;
    } else if (typeof prop === "string" && specialTypes.includes(key)) {
      //console.debug("separateSchemaParts: special type", { key, prop });
      rootFields[key] = prop;
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
  const { separator = "", encapsulator = "", ...flatProps } = rootSchema.properties;
  const flatValues = Object.keys(flatProps).map((k) => obj[k]);

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
          (str, k) => `${str}${separator}${item[k]}${terminator}`,
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

const SERIALIZERS = {
  Alphanumeric: (obj, schema) => ({
    data: encodeToAlphanumeric(obj, schema),
    mode: "alphanumeric",
  }),
  Byte: (obj, schema) => ({
    mode: "byte",
    encoding: "hex",
    data: encodeToHex(obj, schema),
  }),
  String: (obj, schema) => ({
    data: JSON.stringify(obj),
    mode: "byte",
    encoding: "utf-8",
  }),
}

function getSchemaType(schema) {
  const { rootSchema: {properties} } = separateSchemaParts(schema);
  const rootPropKeys = Object.keys(properties);
  if (rootPropKeys.some((k) => specialTypes.includes(k))) return 'Alphanumeric';
  const rootPropFields = Object.values(properties).map((p) => Object.keys(p))
  if (rootPropFields.includes("bits")) return "Byte";
  return "String";
}

export function parseJson(input) {
  const { obj, schema, encoding } = input;
  console.debug("parseJson", { input });
  if (!obj || !schema) return input;

  if (typeof obj !== "object" || obj == null) {
    return {
      data: String(obj ?? ""),
      mode: "byte",
      encoding: "utf-8",
    };
  }

  const serializeFn = SERIALIZERS[getSchemaType(schema)];
  const serialized = serializeFn(obj, schema);

  return serialized;
}
