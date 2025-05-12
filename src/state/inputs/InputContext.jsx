// state/inputs/InputListContext.jsx
import { createContext, useCallback, useContext, useReducer } from "react";
import { Actions, inputReducer, initialInput } from "./inputReducer";

const InputContext = createContext(null);
const DispatchContext = createContext(null);

const initialState = {
  errorCorrectionLevel: 0,
  version: -1, // "auto"
  dataMask: -1, // "auto"
  inputs: [initialInput],
};

export function InputProvider({ children }) {
  const [state, dispatch] = useReducer(inputReducer, initialState);

  const inputsContextValue = {
    addInput: useCallback((payload) => {
      dispatch({
        type: Actions.Add,
        label: payload,
      });
    }, []),
    updateInput: useCallback((payload) => {
      dispatch({ type: Actions.Update, id: payload.id, partial: payload });
    }, []),
    removeInput: useCallback((payload) => {
      dispatch({ type: Actions.Remove, payload });
    }, []),
    reorderInputs: useCallback(({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oldIndex = state.inputs.findIndex((i) => i.id === active.id);
      const newIndex = state.inputs.findIndex((i) => i.id === over.id);
      dispatch({ type: Actions.Reorder, oldIndex, newIndex });
    }, []),
    setType: useCallback((id, type) => {
      dispatch({
        type: Actions.ChangeType,
        id,
        newType: type,
      });
    }),
    setErrorCorrection: (payload) =>
      dispatch({
        type: Actions.ChangeMeta,
        field: "errorCorrectionLevel",
        value: payload,
      }),
    setVersion: (payload) =>
      dispatch({
        type: Actions.ChangeMeta,
        field: "version",
        value: payload,
      }),
    setDataMask: (payload) =>
      dispatch({
        type: Actions.ChangeMeta,
        field: "dataMask",
        value: payload,
      }),
    setInputs: () => dispatch({type: Actions.SetInputs})
  };

  return (
    <InputContext.Provider value={state}>
      <DispatchContext.Provider value={inputsContextValue}>
        {children}
      </DispatchContext.Provider>
    </InputContext.Provider>
  );
}

export const useInputs = () => useContext(InputContext);
export const useInputDispatch = () => useContext(DispatchContext);
