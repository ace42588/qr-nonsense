// src/state/inputs/inputFactory.js
import { jsonSchema } from "../../domain/input/serializationSchemas";

const BITFIELD_DEFAULTS = {
  DEFAULT_FIELD: {
    label: "Field",
    min: 0,
    max: 255,
    bitWidth: 8,
    type: "base10",
    mode: "bits",
  },
  DEFAULT_VALUE: { Field: 0 },
};

const typeDefaults = {
  basic: {
    type: "basic",
    text: "Hello world",
    mode: "byte",
    encoding: "",
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
    layout: [BITFIELD_DEFAULTS.DEFAULT_FIELD],
    values: BITFIELD_DEFAULTS.DEFAULT_VALUE,
  },
  mac: {
    type: "mac",
    algo: "Poly1305",
    key: "supersecret",
    includedFields: [],
  },
};

export function getTypeDefaults(type = "basic") {
  return {
    ...typeDefaults[type],
  };
}

export function createInput({ type = "basic", id, label = "New Input", ...overrides } = {}) {
  return {
    id: id || crypto.randomUUID(),
    label,
    ...getTypeDefaults(type),
    ...overrides,
  };
}
