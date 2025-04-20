import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
import { BitUtils } from "../utils/BitUtils";
import { getVersion, generateQRCodeMatrix } from "../utils/QRUtils";
import { getCodewords } from "../utils/CodewordUtils";
import { getEncoder } from "../Encoders";

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
    case Actions.Highlight: {
      const {payload: {type, id}} = action;
      console.debug({type, id});
    }
  }
}

function getQRDataFromInputs(inputs, errorCorrectionLevel, version, dataMask) {
  if (!inputs) return {};
  const init = {
    segments: [],
    segmentMap: [],
    bitMap: [],
  };
  const encodedInputs = inputs.map(({ data, mode, encoding }) =>
    getEncoder(mode).encode(data, encoding)
  );
  const encoded = encodedInputs.reduce((acc, curr) => {
    return {
      segments: [...acc.segments, ...curr.segments],
      segmentMap: new Map([...acc.segmentMap, ...curr.segmentMap]),
      bitMap: new Map([...acc.bitMap, ...curr.bitMap]),
    };
  }, init);

  const calculatedVersion = getVersion(
    encoded.bitMap.size,
    version,
    errorCorrectionLevel
  );
  const codewords = getCodewords(
    encodedInputs,
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
    ...encoded,
    encodedInputs,
    calculatedVersion,
    codewords,
    matrix,
    calculatedDataMask,
  };
}

const initialData = {
  encodedInputs: [],
  errorCorrectionLevel: 1,
  version: -1,
  calculatedVersion: 1,
  dataMask: -1,
  calculatedDataMask: 0,
  segments: [],
  codewords: [],
  matrix: null,
};
