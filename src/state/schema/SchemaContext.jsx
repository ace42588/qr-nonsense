import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useMemo,
} from "react";
import { schemaReducer, initialSchemaState } from "./schemaReducer";

const SchemaContext = createContext();
const SchemaDispatchContext = createContext();

export function SchemaProvider({ children }) {
  const [state, dispatch] = useReducer(schemaReducer, initialSchemaState);

  const requiredFieldNames = useMemo(() => {
    const topLevel = state.fields;
    const find = (label, parentLabel = null) => {
      if (!parentLabel)
        return (
          topLevel.find((f) => f.label === label)?.name ??
          label[0].toLowerCase()
        );
      const parent = topLevel.find((f) => f.label === parentLabel);
      return (
        parent?.children?.find((f) => f.label === label)?.name ??
        label[0].toLowerCase()
      );
    };

    return {
      itemsKey: find("Items"),
      variantKey: find("Variant", "Items"),
      quantityKey: find("Quantity", "Items"),
      confKey: find("Conference ID"),
      platformKey: find("Platform"),
      txnKey: find("Transaction ID"),
    };
  }, [state.fields]);

  return (
    <SchemaContext.Provider value={state}>
      <SchemaDispatchContext.Provider value={dispatch}>
        {children}
      </SchemaDispatchContext.Provider>
    </SchemaContext.Provider>
  );
}

export const useSchemaContext = () => useContext(SchemaContext);
export const useSchemaDispatch = () => useContext(SchemaDispatchContext);

export const useSchema = () => {
  const dispatch = useSchemaDispatch();

  const setSchema = useCallback(
    (schema) => {
      dispatch({ type: "SET_SCHEMA", payload: schema });
    },
    [dispatch]
  );

  const setFields = useCallback(
    (fields) => {
      dispatch({ type: "SET_FIELDS", payload: fields });
    },
    [dispatch]
  );

  const updateField = useCallback(
    (index, changes) => {
      dispatch({ type: "UPDATE_FIELD", index, payload: changes });
    },
    [dispatch]
  );

  return { setSchema, setFields, updateField };
};
