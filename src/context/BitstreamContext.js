import React, { createContext, useReducer } from "react";
import BitstreamReducer from "./BitstreamReducer";

const initialState = {
  errorCorrectionLevel: 1,
  version: "auto",
  dataMask: "auto",
  sections: [],
  bits: [],
};

export const BitstreamContext = createContext(initialState);

export const BitstreamContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(BitstreamReducer, initialState);

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
  return (
    <BitstreamContext.Provider
      value={
        ...state,
        handleChangeErrorCorrectionLevel,
        handleChangeVersion,
        handleChangeDataMask,
        handleChangeInput,
      }
    >
      {children}
    </BitstreamContext.Provider>
  );
};
