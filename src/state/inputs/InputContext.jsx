// state/inputs/InputListContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";
import { Actions, inputReducer, initialInputs } from "./inputReducer";

const InputContext = createContext();

export function InputProvider({ children }) {
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
    <InputContext.Provider value={inputsContextValue}>
      {children}
    </InputContext.Provider>
  );
}

export function useInputs() {
  return useContext(InputContext);
}
