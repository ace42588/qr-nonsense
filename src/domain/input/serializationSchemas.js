export const bitSchema = {
  type: "object",
  properties: {
    p: {
      type: "integer",
      bits: 2,
    },
    cc: {
      type: "integer",
      bits: 8,
    },
    txn: {
      type: "integer",
      bits: 20,
    },
    i: {
      type: "array",
      items: {
        type: "object",
        properties: {
          v: {
            type: "integer",
            bits: 16,
          },
          q: {
            type: "integer",
            bits: 8,
          },
        },
      },
    },
  },
};

export const jsonSchema = {
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

export const alphaNumericSchema = {
  type: "object",
  properties: {
    encapsulator: "$",
    separator: "%",
    fmt: {
      type: "integer",
    },
    p: {
      type: "string",
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
          separator: ":",
          terminator: "/",
        },
      },
    },
  },
};
