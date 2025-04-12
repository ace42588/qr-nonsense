import React, { createContext, useReducer } from "react";
import BitstreamReducer from "./BitstreamReducer";

const initialState = {
  errorCorrectionLevel: 1,
  version: "auto",
  dataMask: "auto",
  segments: [],
  bits: [],
};

export const BitstreamContext = createContext(initialState);

export const BitstreamContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(BitstreamReducer, initialState);

  function encodeData({ mode, encoding, ...data }) {
    dispatch({
      type: "ENCODE_DATA",
      payload: { mode, encoding, data: Object.values(data)[0] },
    });
  }

  function addBit(bit) {
    dispatch({
      type: "ADD_BIT",
      payload: bit,
    });
  }

  function addByte(byte) {
    dispatch({
      type: "ADD_BIT",
      payload: byte,
    });
  }

  return (
    <BitstreamContext.Provider
      value={{
        ...state,
        encodeData,
      }}
    >
      {children}
    </BitstreamContext.Provider>
  );
};
