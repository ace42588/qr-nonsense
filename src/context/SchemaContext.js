import { createContext, useContext } from "react";

export const SchemaContext = createContext({});
export const useSchemaContext = () => useContext(SchemaContext);
