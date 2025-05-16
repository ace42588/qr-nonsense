// domain/inputDefaults.ts
import { jsonSchema } from "./serializationSchemas";

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
    format: "None",
  },
  bitfield: {
    type: "bitfield",
    layout: [{ label: "Field A", type: "base10" }],
    values: {},
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
