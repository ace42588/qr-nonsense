const defaultSchema = [
  { label: "Platform", name: "p", type: "string", value: "A" },
  { label: "Conference Code", name: "cc", type: "number", value: "133" },
  { label: "Transaction ID", name: "txn", type: "string", value: "99999" },
  {
    label: "Items",
    name: "i",
    type: "array",
    children: [
      { label: "Variant", name: "v", type: "number", value: "5432" },
      { label: "Quantity", name: "q", type: "number", value: "1" },
    ],
  },
];

export const initialSchemaState = {
  schema: {},
  fields: defaultSchema,
};

export function schemaReducer(state, action) {
  switch (action.type) {
    case "SET_SCHEMA":
      return { ...state, schema: action.payload };
    case "SET_FIELDS":
      return { ...state, fields: action.payload };
    case "UPDATE_FIELD":
      return {
        ...state,
        fields: state.fields.map((f, i) =>
          i === action.index ? { ...f, ...action.payload } : f
        ),
      };
    default:
      return state;
  }
}
