import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
import { BitUtils } from "../utils/BitUtils";
import { getQRDataFromInputs } from "../utils/QRUtils";

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
    case Actions.HighlightModules: {
      const { segment } = action;
      const modulesToUpdate = state.segmentMap.get(segment.id);
      const newMatrix = state.matrix.map((row) =>
        row.map((module) => {
          let { bit, isHighlighted } = module;
          const newModule = { ...module };
          if (bit.id && modulesToUpdate.some((id) => id === bit.id)) {
            newModule.isHighlighted = !isHighlighted;
          }
          return newModule;
        })
      );
      return {
        ...state,
        matrix: newMatrix,
      };
    }
    default: {
      console.error("dataReducer", `Unrecognized action: ${action.type}`);
    }
  }
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
