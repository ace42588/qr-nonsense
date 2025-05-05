import { createContext, useCallback, useContext, useReducer } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";
import { parseInput } from "./utils";

const QRDataContext = createContext();
const QRFormatContext = createContext();
const QRMessageContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  const {
    errorCorrectionLevel,
    version,
    calculatedVersion,
    dataMask,
    calculatedDataMask,
  } = state;
  const { segments, codewords, matrix } = state;

  const setErrorCorrection = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload: { errorCorrectionLevel: payload },
    });
  };

  const setVersion = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload: { version: payload },
    });
  };

  const setDataMask = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload: { dataMask: payload },
    });
  };

  const setInputs = (payload) => {
    const parsed = payload.map(({ mode, data, encoding }) =>
      parseInput({ mode, data, encoding })
    );
    dispatch({
      type: Actions.ChangeInputs,
      payload: { inputs: payload },
    });
  };

  const setSegment = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    });
  };

  const setModule = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    });
  };

  const highlightSegment = (payload) => {
    dispatch({
      type: Actions.HighlightSegment,
      payload,
    });
  };

  const highlightModules = (payload) => {
    dispatch({
      type: Actions.HighlightModules,
      payload,
    });
  };

  const dehighlightSegment = (payload) => {
    dispatch({
      type: Actions.HighlightSegment,
      payload,
    });
  };

  const dehighlightModules = (payload) => {
    dispatch({
      type: Actions.HighlightModules,
      payload,
    });
  };

  return (
    <QRDataContext.Provider value={state}>
      <QRFormatContext.Provider
        value={{
          errorCorrectionLevel,
          version,
          dataMask,
          setErrorCorrection,
          setVersion,
          setDataMask,
        }}
      >
        <QRMessageContext.Provider
          value={{
            segments,
            matrix,
            setSegment,
            setInputs,
            highlightModules,
            highlightSegment,
          }}
        >
          {children}
        </QRMessageContext.Provider>
      </QRFormatContext.Provider>
    </QRDataContext.Provider>
  );
}

export const useQRData = () => useContext(QRDataContext);
export const useQRFormat = () => useContext(QRFormatContext);
export const useQRMessage = () => useContext(QRMessageContext);
export const useQRDataDispatch = () => useContext(QRDataDispatchContext);
