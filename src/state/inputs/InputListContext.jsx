// context/InputListContext.js
import { createContext, useContext, useReducer, useRef, useState } from "react";
import { Actions, inputReducer, initialInputs } from "./inputReducer";

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
    updateInput: (payload) => {
      dispatch({ type: Actions.Update, id: payload.id, payload });
    },
    removeInput: (payload) => dispatch({ type: Actions.Remove, id:payload.id }),
    reorderInputs: ({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oldIndex = inputs.findIndex((i) => i.id === active.id);
      const newIndex = inputs.findIndex((i) => i.id === over.id);
      dispatch({ type: "reorder", oldIndex, newIndex });
    },
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
