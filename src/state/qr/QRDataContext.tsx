import { createContext, useContext, useReducer, ReactNode, JSX } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";
import { useDerivedQRData } from "../../hooks/useDerivedQRData";
import { QRState } from "./types";
import { Segment } from "@/domain/shared/types";

interface QRDataDispatchContextValue {
  setErrorCorrection: (payload: number) => void;
  setVersion: (payload: number) => void;
  setDataMask: (payload: number) => void;
  setSegment: (segments: Segment[]) => void;
  setInputs: (payload: Partial<QRState>) => void;
  highlightModules: (ids: string[]) => void;
  clearHighlightedModules: (ids: string[]) => void;
  clearAllHighlights: () => void;
  highlightSegment: (id: string) => void;
}

const QRDataContext = createContext<(QRState & ReturnType<typeof useDerivedQRData>) | null>(null);
const QRDataDispatchContext = createContext<QRDataDispatchContextValue | null>(null);

interface QRDataProviderProps {
  children: ReactNode;
}

export function QRDataProvider({ children }: QRDataProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  const derived = useDerivedQRData();

  const qrDataDispatchContextValue: QRDataDispatchContextValue = {
    setErrorCorrection: (payload) =>
      dispatch({
        type: Actions.ChangeInputs,
        payload: { errorCorrectionLevel: Number(payload) },
      }),
    setVersion: (payload) =>
      dispatch({ type: Actions.ChangeInputs, payload: { version: payload } }),
    setDataMask: (payload) =>
      dispatch({
        type: Actions.ChangeInputs,
        payload: { dataMask: payload },
      }),
    setSegment: (segments) => dispatch({ type: Actions.ChangeInputs, payload: { segments } }),
    setInputs: (payload) => {
      dispatch({ type: Actions.ChangeInputs, payload });
    },
    highlightModules: (ids) => {
      dispatch({ type: Actions.HighlightIds, ids });
    },
    clearHighlightedModules: (ids) => {
      dispatch({ type: Actions.RemoveHighlightIds, ids });
    },
    clearAllHighlights: () => {
      dispatch({ type: Actions.ClearHighlights });
    },
    highlightSegment: (id) => dispatch({ type: Actions.HighlightIds, ids: id }),
  };

  return (
    <QRDataContext.Provider value={{...state, ...derived}}>
      <QRDataDispatchContext.Provider value={qrDataDispatchContextValue}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export function useQRData(): NonNullable<(QRState & ReturnType<typeof useDerivedQRData>)> {
  const context = useContext(QRDataContext);
  if (!context) {
    throw new Error("useQRData must be used within a QRDataProvider");
  }
  return context;
}

export function useQRDataDispatch(): QRDataDispatchContextValue {
  const context = useContext(QRDataDispatchContext);
  if (!context) {
    throw new Error("useQRDataDispatch must be used within a QRDataProvider");
  }
  return context;
} 
