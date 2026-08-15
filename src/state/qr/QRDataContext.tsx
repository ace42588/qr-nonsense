import { createContext, useContext, useReducer, ReactNode, JSX } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";
import { useDerivedQRData } from "../../hooks/useDerivedQRData";
import { QRState } from "./types";

type QRDataValue = QRState & ReturnType<typeof useDerivedQRData>;

interface QRDataDispatchContextValue {
  highlightModules: (ids: string[]) => void;
  clearAllHighlights: () => void;
  highlightSegment: (id: string) => void;
}

const QRDataContext = createContext<QRDataValue | null>(null);
const QRDataDispatchContext = createContext<QRDataDispatchContextValue | null>(null);

interface QRDataProviderProps {
  children: ReactNode;
}

export function QRDataProvider({ children }: QRDataProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  const derived = useDerivedQRData();

  const qrDataDispatchContextValue: QRDataDispatchContextValue = {
    highlightModules: (ids) => {
      dispatch({ type: Actions.HighlightIds, ids });
    },
    clearAllHighlights: () => {
      dispatch({ type: Actions.ClearHighlights });
    },
    highlightSegment: (id) => dispatch({ type: Actions.HighlightIds, ids: id }),
  };

  return (
    <QRDataContext.Provider value={{ ...derived, highlightedIds: state.highlightedIds }}>
      <QRDataDispatchContext.Provider value={qrDataDispatchContextValue}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export function useQRData(): QRDataValue {
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
