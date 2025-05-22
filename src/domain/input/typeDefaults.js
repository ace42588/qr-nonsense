// domain/inputDefaults.ts
import { jsonSchema } from "./serializationSchemas";

const DEFAULT_FIELD = {
  label: "Field",
  min: 0,
  max: 255,
  bitWidth: 8,
  type: "base10",
  mode: "bits", // or "max"
};

const DEFAULT_VALUE = {"Field": 0};

const basicExample = {
  id: crypto.randomUUID(),
  type: "basic",
  label: "Input 0",
  mode: "byte",
  text: "Hello world",
  encoding: "utf-8",
};

const bitFieldExample = {
  id: crypto.randomUUID(),
  type: "bitfield",
  label: "Input 0",
  fields: [],
  values: {},
  encoding: "dec",
};

const jsonExample = {
  id: crypto.randomUUID(),
  type: "json",
  label: "Input 0",
  obj: {},
  schema: {},
  encoding: "none",
};

const macExample = {
  id: crypto.randomUUID(),
  type: "mac",
  label: "Input 0",
  algo: "HMAC-SHA256",
  key: "supersecret",
  selectedInputs: [],
};

const typeDefaults = {
  basic: {
    type: "basic",
    text: "hello world",
    mode: "byte",
    encoding: "utf-8",
  },
  json: {
    type: "json",
    obj: {
      p: "A",
      cc: 133,
      txn: "99999",
      i: [
        { v: 5432, q: 1 },
        { v: 6666, q: 3 },
        { v: 1234, q: 2 },
      ],
    },
    schema: jsonSchema,
    schemaName: "jsonSchema",
    encoding: "None",
  },
  bitfield: {
    type: "bitfield",
    layout: [DEFAULT_FIELD],
    values: DEFAULT_VALUE,
  },
  mac: {
    type: "mac",
    algo: "Poly1305",
    key: "supersecret",
    includedFields: [],
  },
};

export function getTypeExtensions(type) {
  return {
    ...(typeDefaults[type] ?? {}),
  };
}
