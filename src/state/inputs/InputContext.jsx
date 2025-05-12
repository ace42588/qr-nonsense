// state/inputs/InputListContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";
import { Actions, inputReducer, initialInput } from "./inputReducer";

const InputContext = createContext(null);
const DispatchContext = createContext(null);

export function InputProvider({ children }) {
  const [inputs, dispatch] = useReducer(inputReducer, [initialInput]);

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
    removeInput: useCallback(
      (payload) => {
        dispatch({ type: Actions.Remove, payload })},
      []
    ),
    reorderInputs: useCallback(({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oldIndex = inputs.findIndex((i) => i.id === active.id);
      const newIndex = inputs.findIndex((i) => i.id === over.id);
      dispatch({ type: Actions.Reorder, oldIndex, newIndex });
    }, []),
    setType: useCallback((id, type) => {
      dispatch({
        type: Actions.ChangeType,
        id,
        newType: type
      })
    }),
    setErrorCorrection: (payload) =>
      dispatch({
        type: Actions.ChangeInputs,
        payload: { errorCorrectionLevel: payload },
      }),
    setVersion: (payload) =>
      dispatch({ type: Actions.ChangeInputs, payload: { version: payload } }),
    setDataMask: (payload) =>
      dispatch({
        type: Actions.ChangeInputs,
        payload: { dataMask: payload },
      }),
  };

  return (
    <InputContext.Provider value={inputs}>
      <DispatchContext.Provider value={inputsContextValue}>
        {children}
      </DispatchContext.Provider>
    </InputContext.Provider>
  );
}

export const useInputs = () => useContext(InputContext);
export const useInputDispatch = () => useContext(DispatchContext);
