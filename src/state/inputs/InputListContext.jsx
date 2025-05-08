// state/inputs/InputListContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  useState,
} from "react";
import { Actions, inputReducer, initialInputs } from "./inputReducer";

const InputListContext = createContext();

export function InputListProvider({ children }) {
  const [inputs, dispatch] = useReducer(inputReducer, initialInputs);

  const inputsContextValue = {
    inputs,
    addInput: useCallback((payload) => {
      dispatch({
        type: Actions.Add,
        label: payload,
      });
    }, []),
    updateInput: useCallback((payload) => {
      dispatch({ type: Actions.Update, id: payload.id, payload });
    }, []),
    removeInput: useCallback(
      (payload) => {
        console.debug("removeInput", {payload});
        dispatch({ type: Actions.Remove, payload })},
      []
    ),
    reorderInputs: useCallback(({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oldIndex = inputs.findIndex((i) => i.id === active.id);
      const newIndex = inputs.findIndex((i) => i.id === over.id);
      dispatch({ type: Actions.Reorder, oldIndex, newIndex });
    }, []),
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
