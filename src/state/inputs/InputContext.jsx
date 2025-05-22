// src/state/inputs/InputContext.jsx
import { createContext, useContext, useReducer } from "react";
import { inputReducer, initialState } from "./inputReducer";

const InputsStateContext = createContext(null);
const InputsDispatchContext = createContext(null);

export function InputProvider({ children }) {
  const [state, dispatch] = useReducer(inputReducer, initialState);

  return (
    <InputsStateContext.Provider value={state}>
      <InputsDispatchContext.Provider value={dispatch}>
        {children}
      </InputsDispatchContext.Provider>
    </InputsStateContext.Provider>
  );
}

export const useInputs = () => useContext(InputsStateContext);
export const useInputDispatch = () => useContext(InputsDispatchContext);