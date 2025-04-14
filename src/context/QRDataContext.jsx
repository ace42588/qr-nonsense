import { createContext, useContext, useReducer } from "react";
import { Actions } from "../Constants";
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
    case Actions.ChangeInput: {
      const { inputs } = action.payload;
      const chunks = inputs.map(({data, mode, encoding}, idx) => {
        Encoders(mode).encode(data, encoding, idx)
      })
      const bits = QRUtils.getBitsFromChunks(chunks);
      const version = QRUtils.getVersion(
        bits,
        state.version,
        state.errorCorrectionLevel
      );
      const finalBits = QRUtils.getOrderedBits(
        [newChunks],
        version,
        state.errorCorrectionLevel
      );
      return {
        ...state,
        calculatedVersion: version,
        chunks: newChunks,
        bits: [...finalBits],
      };
    }
  }
}

const initialData = {
  errorCorrectionLevel: 1,
  version: -1,
  calculatedVersion: 1,
  dataMask: 0,
  chunks: [],
  bits: [],
};
