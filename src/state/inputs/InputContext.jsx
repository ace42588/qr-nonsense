// state/inputs/InputListContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useReducer,
} from "react";
import { Actions, inputReducer, initialInputs } from "./inputReducer";

const InputContext = createContext(null);
const DispatchContext = createContext(null);

export function InputProvider({ children }) {
  const [inputs, dispatch] = useReducer(inputReducer, initialInputs);

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
    setType: useCallback((payload) => {
      dispatch({
        type: Actions.ChangeType,
        id: payload.id,
        newType: payload.type
      })
    })
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
