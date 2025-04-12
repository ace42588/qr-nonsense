import React, { useState } from "react";
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
import "./App.css";

function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode
  const [segments, setSegments] = useState([]);
  const [bitStream, setBitStream] = useState();
  const [version, setVersion] = useState("auto");
  const [dataMask, setDataMask] = useState("auto");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState(1);

  const selectUI = () => {
    if (inputMode === "merch") {
      return (
        <MerchForm
          setBitStream={setBitStream}
          version={version}
          errorCorrectionLevel={errorCorrectionLevel}
        />
      );
    } else if (inputMode === "scan") {
      return (
        <VideoScanner
          setBitStream={setBitStream}
          setErrorCorrectionLevel={setErrorCorrectionLevel}
          setVersion={setVersion}
          setDataMask={setDataMask}
        />
      );
    }
    return (
      <InputForm
        setBitStream={setBitStream}
        version={version}
        errorCorrectionLevel={errorCorrectionLevel}
      />
    );
  };

  return (
    <div className="App">
      <div className="row">
        <h1>QR Code Generator</h1>
        <div className="row">
          <ModeSelector mode={inputMode} setMode={setInputMode} />
        </div>
      </div>
      <div className="row">
        <div className="column">
          <div className="row">
            <ErrorCorrectionSelector
              value={errorCorrectionLevel}
              onChange={setErrorCorrectionLevel}
            />
          </div>
          <div className="row">
            <VersionSelector value={version} onChange={setVersion} />
          </div>
          <div className="row">
            <DataMaskSelector value={dataMask} onChange={setDataMask} />
          </div>
          <div className="row">{selectUI()}</div>
        </div>
        <div className="column">
          <QRCodeCanvas
            bitStream={bitStream}
            setBitStream={setBitStream}
            errorCorrectionLevel={errorCorrectionLevel}
            version={version}
            dataMask={dataMask}
          />
        </div>
      </div>
      <div className="row">
        <SegmentDisplay bitStream={bitStream} setBitStream={setBitStream} />
      </div>
    </div>
  );
}

export default App;
