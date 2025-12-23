import { createContext, useContext, ReactNode, JSX, useState } from "react";
import { QArtResult } from "@/domain/qart";

interface QArtContextValue {
  qartResult: QArtResult | null;
  setQartResult: (result: QArtResult | null) => void;
}

const QArtContext = createContext<QArtContextValue | null>(null);

interface QArtProviderProps {
  children: ReactNode;
}

export function QArtProvider({ children }: QArtProviderProps): JSX.Element {
  const [qartResult, setQartResult] = useState<QArtResult | null>(null);
  
  return (
    <QArtContext.Provider value={{ qartResult, setQartResult }}>
      {children}
    </QArtContext.Provider>
  );
}

export function useQArtResult(): QArtContextValue {
  const context = useContext(QArtContext);
  if (!context) {
    // Return default values if not in QArt context (for components that aren't in QArt view)
    return { qartResult: null, setQartResult: () => {} };
  }
  return context;
}

