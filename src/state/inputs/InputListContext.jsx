// context/InputListContext.js
import { createContext, useContext } from "react";

const InputListContext = createContext([]);

export function InputListProvider({ inputs, children }) {
  return (
    <InputListContext.Provider value={inputs}>
      {children}
    </InputListContext.Provider>
  );
}

export function useInputList() {
  return useContext(InputListContext);
}
