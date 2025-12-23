import { createContext, useContext, useReducer, ReactNode, JSX } from "react";
import { inputReducer, initialState } from "./inputReducer";
import { InputAction, InputState } from "@/types";

const InputsStateContext = createContext<InputState | null>(null);
const InputsDispatchContext = createContext<React.Dispatch<InputAction> | null>(null);

interface InputProviderProps {
  children: ReactNode;
}

export function InputProvider({ children }: InputProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(inputReducer, initialState);

  return (
    <InputsStateContext.Provider value={state}>
      <InputsDispatchContext.Provider value={dispatch}>
        {children}
      </InputsDispatchContext.Provider>
    </InputsStateContext.Provider>
  );
}

export function useInputs(): InputState {
  const context = useContext(InputsStateContext);
  if (!context) {
    throw new Error("useInputs must be used within an InputProvider");
  }
  return context;
}

export function useInputDispatch(): React.Dispatch<InputAction> {
  const context = useContext(InputsDispatchContext);
  if (!context) {
    throw new Error("useInputDispatch must be used within an InputProvider");
  }
  return context;
} 