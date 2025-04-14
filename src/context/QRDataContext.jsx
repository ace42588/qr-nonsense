import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
import { QRUtils } from "../Utilities";
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
      //console.debug({inputs});
      // ({id, header, segments})[]
      const chunks = inputs.map(({ data, mode, encoding }, idx) =>
        Encoders(mode).encode(data, idx, encoding)
      );
      //console.debug({ chunks });
      const segments = chunks.flatMap(({ segments }) => segments);
      const dataBits = QRUtils.getBitsFromChunks(chunks);
      const calculatedVersion = QRUtils.getVersion(
        dataBits,
        state.version,
        state.errorCorrectionLevel
      );
      const codewords = QRUtils.getCodewords(
        chunks,
        calculatedVersion,
        state.errorCorrectionLevel
      );
      const newState = {
        ...state,
        calculatedVersion,
        chunks,
        segments,
        codewords,
      };
      console.log({ newState });
      return newState;
    }
    case Actions.ChangeDataMask: {
      const { dataMask } = action;
      return { ...state, dataMask };
    }
    case Actions.ChangeVersion: {
      const { version } = action;
      return { ...state, version };
    }
    case Actions.ChangeErrorCorretionLevel: {
      const { errorCorrectionLevel } = action;
      return { ...state, errorCorrectionLevel };
    }
  }
}

const initialData = {
  errorCorrectionLevel: 1,
  version: -1,
  calculatedVersion: 1,
  dataMask: 0,
  chunks: [],
  segments: [],
  codewords: [],
};
