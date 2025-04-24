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

/*
export const useQRInputs = () => {
  const dispatch = useQRDataDispatch();
  
  const setInputs = useCallback((inputs) => {
    dispatch({ type: "SET_INPUTS", payload: inputs });
  }, [dispatch]);
  if (!Array.isArray(inputs)) return {};
  const init = {
    segments: [],
    segmentMap: [],
    bitMap: [],
  };
  try {
    const encodedInputs = inputs.map(({ data, mode, encoding }) =>
      getEncoder(mode).encode(data, encoding)
    );
    const encoded = encodedInputs.reduce((acc, curr) => {
      return {
        segments: [...acc.segments, ...curr.segments],
        segmentMap: new Map([...acc.segmentMap, ...curr.segmentMap]),
        bitMap: new Map([...acc.bitMap, ...curr.bitMap]),
      };
    }, init);

    const calculatedVersion = getVersion(
      encoded.bitMap.size,
      version,
      errorCorrectionLevel
    );
    const codewords = getCodewords(
      encodedInputs,
      calculatedVersion,
      errorCorrectionLevel
    );
    const { matrix, dataMask: calculatedDataMask } = generateQRCodeMatrix({
      version: calculatedVersion,
      errorCorrectionLevel,
      dataMask,
      codewords,
    });
    return {
      ...encoded,
      ecCodewords: codewords.filter((cw) => cw.type === "errorCorrection"),
      encodedInputs,
      calculatedVersion,
      codewords,
      matrix,
      calculatedDataMask,
    };
  } catch (e) {
    return { error: e };
  }
}
*/