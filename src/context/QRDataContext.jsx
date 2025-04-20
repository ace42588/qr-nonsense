import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
import { BitUtils } from "../utils/BitUtils";
import { QRUtils, generateQRCodeMatrix } from "../utils/QRUtils";
import Encoders from "../Encoders";

export const QRDataContext = createContext(null);
export const QRDataDispatchContext = createContext(null);

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  return (
    <QRDataContext.Provider value={state}>
      <QRDataDispatchContext.Provider value={dispatch}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export function useQRData() {
  return useContext(QRDataContext);
}

export function useQRDataDispatch() {
  return useContext(QRDataDispatchContext);
}

function dataReducer(state, action) {
  switch (action.type) {
    case Actions.ChangeInput: {
      const { inputs } = action;
      const newQRData = getQRDataFromInputs(
        inputs,
        state.errorCorrectionLevel,
        state.version,
        state.dataMask
      );
      const newState = {
        ...state,
        ...newQRData,
        inputs,
      };
      console.log({ newState });
      return newState;
    }
    case Actions.ChangeDataMask: {
      const { dataMask } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        state.errorCorrectionLevel,
        state.version,
        dataMask
      );
      return { ...state, ...newQRData, dataMask };
    }
    case Actions.ChangeVersion: {
      const { version } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        state.errorCorrectionLevel,
        version,
        state.dataMask
      );
      return { ...state, ...newQRData, version };
    }
    case Actions.ChangeErrorCorretionLevel: {
      const { errorCorrectionLevel } = action;
      const newQRData = getQRDataFromInputs(
        state.inputs,
        errorCorrectionLevel,
        state.version,
        state.dataMask
      );
      return { ...state, ...newQRData, errorCorrectionLevel };
    }
  }
}


function getQRDataFromInputs(inputs, errorCorrectionLevel, version, dataMask) {
  if (!inputs) return {};
  const chunks = inputs.map(({ data, mode, encoding }) =>
    Encoders(mode).encode(data, encoding)
  );
  console.debug("getQRDataFromInputs", {chunks});
  const segments = chunks.flatMap(({ segments }) => segments);
  const calculatedVersion = QRUtils.getVersion(
    chunks,
    version,
    errorCorrectionLevel
  );
  const codewords = QRUtils.getCodewords(
    chunks,
    calculatedVersion,
    errorCorrectionLevel
  );
  const { matrix, dataMask: calculatedDataMask } = generateQRCodeMatrix({
    version: calculatedVersion,
    errorCorrectionLevel,
    dataMask,
    codewords,
  });
  return {
    chunks,
    segments,
    calculatedVersion,
    codewords,
    matrix,
    calculatedDataMask,
  };
}

const initialData = {
  inputs: [],
  errorCorrectionLevel: 1,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  chunks: [],
  segments: [],
  codewords: [],
  matrix: null,
};
