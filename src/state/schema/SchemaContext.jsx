import { createContext, useCallback, useContext, useReducer } from "react";
import { schemaReducer, initialSchemaState } from "./schemaReducer";

const SchemaContext = createContext();
const SchemaDispatchContext = createContext();

export function SchemaProvider({ children }) {
  const [state, dispatch] = useReducer(schemaReducer, initialSchemaState);

  return (
    <SchemaContext.Provider value={state}>
      <SchemaDispatchContext.Provider value={dispatch}>
        {children}
      </SchemaDispatchContext.Provider>
    </SchemaContext.Provider>
  );
}

export const useSchemaDispatch = () => useContext(SchemaDispatchContext);

export const useSchema = () => {
  const dispatch = useSchemaDispatch();

  const setSchema = useCallback((schema) => {
    dispatch({ type: "SET_SCHEMA", payload: schema });
  }, [dispatch]);

  const setFields = useCallback((fields) => {
    dispatch({ type: "SET_FIELDS", payload: fields });
  }, [dispatch]);

  const updateField = useCallback((index, changes) => {
    dispatch({ type: "UPDATE_FIELD", index, payload: changes });
  }, [dispatch]);

  return { setSchema, setFields, updateField };
};
