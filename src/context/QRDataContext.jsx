import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
import { BitUtils } from "../utils/BitUtils";
import { QRUtils, generateQRCodeMatrix } from "../utils/QRUtils";
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
  }
}


function getQRDataFromInputs(inputs, errorCorrectionLevel, version, dataMask) {
  if (!inputs) return {};
  const encodedInputs = inputs.map(({ data, mode, encoding }) =>
    getEncoder(mode).encode(data, encoding)
  );
  const encoded = encodedInputs.reduce((acc, curr) => {
    return {
      segments: 
      bitMap: new Map([...acc.bitMap, ...curr.bitMap])
    }
  })
  const bitMaps = encodedInputs.map(({bitMap}) => bitMap);
  const bitMap = bitMaps.reduce((map, current) => new Map([...map, ...current]));
  
  const segments = encodedInputs.flatMap(({segment}) => segment);
  const segmentMaps = encodedInputs.map(({ segmentMap }) => segmentMap);
  const segmentMap = segmentMaps.reduce((map, current) => new Map([...map, ...current]));
  
  const calculatedVersion = QRUtils.getVersion(
    bitMap.size,
    version,
    errorCorrectionLevel
  );
  const codewords = QRUtils.getCodewords(
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
    encodedInputs,
    segments,
    calculatedVersion,
    codewords,
    matrix,
    calculatedDataMask,
    bitMap,
    segmentMap
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
