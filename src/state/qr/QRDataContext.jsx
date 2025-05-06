import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";

import {
  encodeInput,
  finalizeEncoding,
  generateMatrix,
  getBits,
  getCodewords,
  getMinimumQRCodeVersion,
  getRequiredDataCodewords,
} from "../../domain/qr";

import { parseInput, getVersion } from "./utils";

const QRDataContext = createContext();
const QRFormatContext = createContext();
const QRMessageContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  let {
    inputs,
    dataMask: selectedDataMask,
    version: selectedVersion,
    errorCorrectionLevel,
  } = state;

  const segments = useMemo(
    () =>
      inputs.flatMap(({ data, mode, encoding }) =>
        encodeInput(mode, data, { inputEncoding: encoding })
      ),
    [inputs]
  );

  const bits = useMemo(
    () => segments.flatMap((s) => getBits(s.value, s.length)),
    [segments]
  );

  const version = useMemo(() => getVersion, [selectedVersion, bits, errorCorrectionLevel]);

  const { matrix, dataMask } = useMemo(() => {
    const requiredDataCodewords = getRequiredDataCodewords(
      version,
      errorCorrectionLevel
    );
    const finalizedBits = finalizeEncoding(bits, requiredDataCodewords);
    const codewords = getCodewords(
      finalizedBits,
      version,
      errorCorrectionLevel
    );
    return generateMatrix({
      version,
      errorCorrectionLevel,
      dataMask: selectedDataMask,
      codewords,
    });
  }, [version, errorCorrectionLevel, bits, selectedDataMask]);

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
      payload: { inputs: parsed },
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
