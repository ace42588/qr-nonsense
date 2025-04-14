import { createContext, useContext, useReducer } from "react";

import { QRUtils } from "../Utilities";
import Encoders from "../Encoders";

export const QRDataContext = createContext(null);
export const QRDataDispatchContext = createContext(null);

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  /*
  function handleChangeErrorCorrectionLevel(errorCorrectionLevel) {
    dispatch({
      type: "MODIFY_ERROR",
      payload: { errorCorrectionLevel },
    });
  }
  function handleChangeVersion(version) {
    dispatch({
      type: "MODIFY_VERSION",
      payload: { version },
    });
  }
  function handleChangeDataMask(dataMask) {
    dispatch({
      type: "MODIFY_DATA_MASK",
      payload: { dataMask },
    });
  }
  function handleChangeInput({ mode, encoding, ...data }) {
    dispatch({
      type: "ENCODE_DATA",
      payload: { mode, encoding, data: Object.values(data)[0] },
    });
  }
  */

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
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const chunk = Encoders(mode).encode(data, encoding);
      const newChunks = [...state.chunks, chunk];
      const bits = QRUtils.getBitsFromChunks()
      const version = QRUtils.getVersion(bits, version, )
      const finalBits = QRUtils.getOrderedBits(
        newChunks,
        state.version,
        state.errorCorrectionLevel
      );
      return {
        ...state,
        version: 
        sections: newChunks,
        bits: [...finalBits],
      };
    }
    case "HIGHLIGHT_DATA": {
    }
  }
}

const initialData = {
  errorCorrectionLevel: 1,
  version: "-1",
  dataMask: "-1",
  chunks: [],
  bits: [],
};
