import { createContext, useContext, useMemo, useReducer } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";

import { useDerivedQRData } from "./useDerivedQRData";
import { parseInput } from "./utils";

const QRDataContext = createContext();
const QRFormatContext = createContext();
const QRMessageContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  const {
    inputs,
    version: selectedVersion,
    dataMask: selectedDataMask,
    errorCorrectionLevel,
  } = state;

  const derived = useDerivedQRData({
    inputs,
    version: selectedVersion,
    dataMask: selectedDataMask,
    errorCorrectionLevel,
  });

  const formatContextValue = useMemo(
    () => ({
      errorCorrectionLevel,
      version: derived.version,
      dataMask: derived.dataMask,
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
    }),
    [errorCorrectionLevel, derived.version, derived.dataMask]
  );

  const messageContextValue = useMemo(
    () => ({
      segments: derived.segments,
      matrix: derived.matrix,
      idMap: derived.idMap,
      setSegment: (payload) =>
        dispatch({ type: Actions.ChangeInputs, payload }),
      setInputs: (payload) => {
        const parsed = payload.map(({ mode, data, encoding }) =>
          parseInput({ mode, data, encoding })
        );
        dispatch({ type: Actions.ChangeInputs, payload: { inputs: parsed } });
      },
      highlightModules: (payload) =>{
        const moduleIds = derived.idMap.get(payload.id);
        dispatch({ type: Actions.HighlightIds, payload: moduleIds })
      },
      highlightSegment: (payload) =>
        dispatch({ type: Actions.HighlightIds, payload }),
    }),
    [derived.segments, derived.matrix]
  );

  return (
    <QRDataContext.Provider value={state}>
      <QRFormatContext.Provider value={formatContextValue}>
        <QRMessageContext.Provider value={messageContextValue}>
          {children}
        </QRMessageContext.Provider>
      </QRFormatContext.Provider>
    </QRDataContext.Provider>
  );
}

export const useQRData = () => useContext(QRDataContext);
export const useQRFormat = () => useContext(QRFormatContext);
export const useQRMessage = () => useContext(QRMessageContext);
