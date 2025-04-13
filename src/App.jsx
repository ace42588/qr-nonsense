import { useState, useReducer } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay";
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./components/Selectors";
import InputForm from "./components/InputForm";
import MerchForm from "./components/MerchForm";
import VideoScanner from "./components/VideoScanner";
import { createBlocks } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./QRCodeMatrix";
import { QRDataContext, QRDataDispatchContext } from './context/QRDataContext';

import { QRDataReducer } from "./context/QRDataReducer"

import "./App.css";

function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode
  const [state, dispatch] = useReducer(QRDataReducer, "test");

  function handleChangeErrorCorrectionLevel(errorCorrectionLevel) {
    dispatch({
      type: "MODIFY_ERROR",
      payload: { errorCorrectionLevel },
    });
  }
  function handleChangeVersion(version) {
    dispatch({
      type: "MODIFY_VERSION",
      payload: { version },
    });
  }
  function handleChangeDataMask(dataMask) {
    dispatch({
      type: "MODIFY_DATA_MASK",
      payload: { dataMask },
    });
  }
  function handleChangeInput({ mode, encoding, ...data }) {
    dispatch({
      type: "ENCODE_DATA",
      payload: { mode, encoding, data: Object.values(data)[0] },
    });
  }

  const selectUI = () => {
    if (inputMode === "merch") {
      return <MerchForm />;
    } else if (inputMode === "scan") {
      return <VideoScanner />;
    }
    return <InputForm />;
  };

  return (
    <div className="App">
      <div className="row">
        <h1>QR Code Generator</h1>
        <div className="row">
          <ModeSelector mode={inputMode} setMode={setInputMode} />
        </div>
      </div>
      <TasksContext.Provider value={tasks}>
        <div className="row">
          <div className="column">
            <div className="row">
              <ErrorCorrectionSelector />
            </div>
            <div className="row">
              <VersionSelector />
            </div>
            <div className="row">
              <DataMaskSelector />
            </div>
            <div className="row">{selectUI()}</div>
          </div>
          <div className="column">
            <QRCodeCanvas />
          </div>
        </div>
        <div className="row">
          <SegmentDisplay />
        </div>
      </TasksContext.Provider>
    </div>
  );
}

export default App;
