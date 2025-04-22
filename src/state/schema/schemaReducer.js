export const initialSchemaState = {
  schema: {},
  fields: [],
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
