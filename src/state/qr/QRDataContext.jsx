import { createContext, useCallback, useContext, useReducer } from "react";
import { dataReducer, initialData } from "./qrReducer";

//QRDataDispatchContext
const QRDataContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  return (
    <QRDataContext.Provider value={state}>
      <QRDataDispatchContext.Provider value={dispatch}>
        {children}
      </QRDataDispatchContext.Provider>
    </QRDataContext.Provider>
  );
}

export const useQRData = () => useContext(QRDataContext);
export const useQRDataDispatch = () => useContext(QRDataDispatchContext);

export const useQRSegments = () => {
  const dispatch = useQRDataDispatch();

  const setSegments = useCallback((segments) => {
    dispatch({ type: "SET_SEGMENTS", payload: segments });
  }, [dispatch]);

  const toggleSegmentHighlight = useCallback((segmentId) => {
    dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
  }, [dispatch]);

  const clearHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setSegments, toggleSegmentHighlight, clearHighlights };
};

export const useQRModules = () => {
  const dispatch = useQRDataDispatch();

  const setModules = useCallback((segments) => {
    dispatch({ type: "SET_MODULES", payload: segments });
  }, [dispatch]);

  const toggleModuleHighlight = useCallback((segmentId) => {
    dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
  }, [dispatch]);

  const clearModuleHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setModules, toggleModuleHighlight, clearModuleHighlights };
};

export const useQRMatrix = () => {
  const dispatch = useQRDataDispatch();

  const setSegments = useCallback((segments) => {
    dispatch({ type: "SET_SEGMENTS", payload: segments });
  }, [dispatch]);

  const toggleSegmentHighlight = useCallback((segmentId) => {
    dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
  }, [dispatch]);

  const clearHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setSegments, toggleSegmentHighlight, clearHighlights };
};
