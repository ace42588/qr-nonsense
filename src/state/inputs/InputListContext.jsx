// context/InputListContext.js
import { createContext, useContext, useReducer } from "react";
import {Actions, inputReducer, initialInputs } from "./inputRedicer";

const InputListContext = createContext();

export function InputListProvider({ inputs, children }) {
  const [state, dispatch] = useReducer(inputReducer, initialInputs);
  return (
    <InputListContext.Provider value={state}>
      {children}
    </InputListContext.Provider>
  );
}

export function useInputList() {
  return useContext(InputListContext);
}
