import React, { createContext, useReducer } from "react";
import QRDataReducer from "./QRDataReducer";

const initialState = {
  errorCorrectionLevel: 1,
  version: "auto",
  dataMask: "auto",
  sections: [],
  bits: [],
};

export const QRDataContext = createContext(initialState);
export const QRDataDispatchContext = createContext(null);
