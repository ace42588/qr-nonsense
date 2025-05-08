// context/InputListContext.js
import { createContext, useContext, useReducer, useRef, useState} from "react";
import { Actions, inputReducer, initialInputs } from "./inputRedicer";

const InputListContext = createContext();

export function InputListProvider({ children }) {
  const [inputs, dispatch] = useReducer(inputReducer, initialInputs);
  const nextLabel = useRef(inputs.length);

  const inputsContextValue = {
    inputs,
    addInput: (label = `Input ${nextLabel.current++}`) => {
      dispatch({
        type: Actions.Add,
        label,
      });
    },
    updateInput: (id, payload) => {
      dispatch({ type: Actions.Update, id, payload });
    },
    removeInput: (id) => dispatch({ type: Actions.Remove, id }),
  };

  return (
    <InputListContext.Provider value={inputsContextValue}>
      {children}
    </InputListContext.Provider>
  );
}

export function useInputList() {
  return useContext(InputListContext);
}
