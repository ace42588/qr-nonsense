import { createContext, useCallback, useContext, useReducer } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";

const QRDataContext = createContext();
const QRFormatContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  
  const setInputs = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setErrorCorrection = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setVersion = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setDataMask = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setSegment = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setModule = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const highlightSegment = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const highlightModules = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const dehighlightSegment = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const dehighlightModules = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };

  return (
    <QRDataContext.Provider value={state}>
      <QRFormat>
      <QRDataDispatchContext.Provider value={dispatch}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export const useQRData = () => useContext(QRDataContext);
export const useQRDataDispatch = () => useContext(QRDataDispatchContext);