import { RecursiveSchemaEditor } from "../schema/SchemaEditor";

const inputSchema = {
  type: "object",
  required: ["transactionId", "items"],
  properties: {
    transactionId: {
      type: "string",
    },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["variantId", "quantity"],
        properties: {
          variantId: {
            type: "integer",
          },
          quantity: {
            type: "integer",
          },
        },
      },
      //uniqueItems: true,
    },
  },
};

const outputSchema = {
  type: "object",
  required: ["txn", "i"],
  properties: {
    txn: {
      type: "string",
    },
    i: {
      type: "array",
      items: {
        type: "object",
        required: ["v", "q"],
        properties: {
          v: {
            type: "integer",
          },
          q: {
            type: "integer",
          },
        },
      },
      //uniqueItems: true,
    },
  },
};

export function InputOutput() {
  return (
    <>
      <RecursiveSchemaEditor
        title="Input Schema"
        value={inputSchema}
        onChange={(schema) => {
          console.log("Input Schema changed:", schema);
        }}
      />
      <RecursiveSchemaEditor
        title="Output Schema"
        value={outputSchema}
        onChange={(schema) => {
          console.log("Output Schema changed:", schema);
        }}
      />
    </>
  );
}
