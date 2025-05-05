import { createContext, useCallback, useContext, useReducer } from "react";
import { Actions, qrReducer, initialQRState } from "./qrReducer";

//QRDataDispatchContext
const QRDataContext = createContext();
const QRDataDispatchContext = createContext();

export function QRDataProvider({ children }) {
  const [state, dispatch] = useReducer(qrReducer, initialQRState);
  
  const setInputs = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setErrorCorrection = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setVersion = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };
  
  const setDataMask = (payload) => {
    dispatch({
      type: Actions.ChangeInputs,
      payload,
    })
  };

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

export const useQRInputs = () => {
  const dispatch = useQRDataDispatch();
  
  const setInputs = useCallback(
    (inputs) => {
      dispatch({
        type: "UPDATE_INPUTS",
        payload: { inputs },
      });
    },
    [dispatch]
  );
  
  const setErrorCorrectionLevel = useCallback(
    (errorCorrectionLevel) => {
      dispatch({
        type: "UPDATE_INPUTS",
        payload: { errorCorrectionLevel },
      });
    },
    [dispatch]
  );
  
  const setVersion = useCallback(
    (version) => {
      dispatch({
        type: "UPDATE_INPUTS",
        payload: { version },
      });
    },
    [dispatch]
  );
  
  const setDataMask = useCallback(
    (dataMask) => {
      dispatch({
        type: "UPDATE_INPUTS",
        payload: { dataMask },
      });
    },
    [dispatch]
  );

  return { setInputs, setErrorCorrectionLevel, setVersion, setDataMask };  
};

export const useQRSegments = () => {
  const dispatch = useQRDataDispatch();

  const setSegments = useCallback(
    (segments) => {
      dispatch({ type: "SET_SEGMENTS", payload: segments });
    },
    [dispatch]
  );

  const toggleSegmentHighlight = useCallback(
    (segmentId) => {
      dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
    },
    [dispatch]
  );

  const clearHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setSegments, toggleSegmentHighlight, clearHighlights };
};

export const useQRModules = () => {
  const dispatch = useQRDataDispatch();

  const setModules = useCallback(
    (segments) => {
      dispatch({ type: "SET_MODULES", payload: segments });
    },
    [dispatch]
  );

  const toggleModuleHighlight = useCallback(
    (segmentId) => {
      dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
    },
    [dispatch]
  );

  const clearModuleHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setModules, toggleModuleHighlight, clearModuleHighlights };
};

export const useQRMatrix = () => {
  const dispatch = useQRDataDispatch();

  const setSegments = useCallback(
    (segments) => {
      dispatch({ type: "SET_SEGMENTS", payload: segments });
    },
    [dispatch]
  );

  const toggleSegmentHighlight = useCallback(
    (segmentId) => {
      dispatch({ type: "TOGGLE_HIGHLIGHT", payload: segmentId });
    },
    [dispatch]
  );

  const clearHighlights = useCallback(() => {
    dispatch({ type: "CLEAR_HIGHLIGHTS" });
  }, [dispatch]);

  return { setSegments, toggleSegmentHighlight, clearHighlights };
};
