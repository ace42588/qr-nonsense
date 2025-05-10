// domain/inputDefaults.ts

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

const baseDefaults = {
  data: "",
  values: {},
  layout: [],
};

const typeDefaults = {
  string: {
    type: "string",
    text: "hello world",
  },
  bitfield: {
    type: "bitfield",
    layout: [
      { label: "Field A", type: "base10" },
    ],
    values: {},
  },
  mac: {
    type: "mac",
    algo: "poly1305",
    key: "supersecret",
    includedFields: [],
  },
  // add others here...
};

export function getInputDefaults(type) {
  return {
    id: crypto.randomUUID(),
    ...baseDefaults,
    ...(typeDefaults[type] ?? {}),
  };
}
