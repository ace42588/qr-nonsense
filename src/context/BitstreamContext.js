import React, { createContext, useReducer } from "react";
import BitstreamReducer from "./BitstreamReducer";

const initialState = {
  bits: [],
};

export const BitstreamContext = createContext(initialState);

export const BitstreamContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(BitstreamReducer, initialState);

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
        bits: state.bits,
        addBit,
      }}
    >
      {children}
    </BitstreamContext.Provider>
  );
};
