import React, { createContext, useReducer } from "react";

const initialState = {
  errorCorrectionLevel: 1,
  version: "auto",
  dataMask: "auto",
  chunks: [],
  bits: [],
};

export const QRDataContext = createContext(initialState);
export const QRDataDispatchContext = createContext(null);
