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

import { parseInput } from "./utils";

const QRDataContext = createContext();
const QRFormatContext = createContext();
const QRMessageContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  const { errorCorrectionLevel } = state;

  const segments = useMemo(() =>
    state.inputs.flatMap(({ data, mode, encoding }) =>
      encodeInput(mode, data, { inputEncoding: encoding })
    )
  );

  const bits = useMemo(() =>
    segments.flatMap((s) => getBits(s.value, s.length))
  );

  const version = useMemo(() => {
    let version = parseInt(state.version) || -1;
    if (1 <= version && version <= 40) {
      return version;
    } else if (version == -1) {
      return getMinimumQRCodeVersion(bits.length, errorCorrectionLevel);
    }
    throw new Error(`Invalid version: ${state.version.toString()}`);
  });

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
      dataMask: state.dataMask,
      codewords,
    });
  });

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
