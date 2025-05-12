// /src/state/qr/QRDataContext.jsx
import { createContext, useContext, useMemo, useReducer } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";

import { useDerivedQRData } from "./useDerivedQRData";

const QRDataContext = createContext(null);
const QRDataDispatchContext = createContext(null);
const QRFormatContext = createContext();
const QRMessageContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);

  const qrDataDispatchContextValue = {
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
    setSegment: (payload) => dispatch({ type: Actions.ChangeInputs, payload }),
    setInputs: (payload) => {
      dispatch({ type: Actions.ChangeInputs, payload });
    },
    highlightModules: (ids) => {
      dispatch({ type: Actions.HighlightIds, ids });
    },
    clearHighlightedModules: (ids) => {
      dispatch({ type: Actions.RemoveHighlightIds, ids });
    },
    highlightSegment: (id) => dispatch({ type: Actions.HighlightIds, id }),
  };

  return (
    <QRDataContext.Provider value={state}>
      <QRDataDispatchContext.Provider value={qrDataDispatchContextValue}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export const useQRData = () => useContext(QRDataContext);
export const useQRDataDispatch = () => useContext(QRDataDispatchContext);
