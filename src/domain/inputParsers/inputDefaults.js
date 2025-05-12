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
    schema: existingSchema,
    format: "None",
  },
  bitfield: {
    type: "bitfield",
    layout: [{ label: "Field A", type: "base10" }],
    values: {},
  },
  mac: {
    type: "mac",
    algo: "poly1305",
    key: "supersecret",
    includedFields: [],
  },
};

export function getTypeExtensions(type) {
  return {
    ...(typeDefaults[type] ?? {}),
  };
}
