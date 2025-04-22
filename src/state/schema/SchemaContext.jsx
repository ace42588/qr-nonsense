import { createContext, useContext, useReducer } from "react";
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

export const useSchema = () => useContext(SchemaContext);
export const useSchemaDispatch = () => useContext(SchemaDispatchContext);
