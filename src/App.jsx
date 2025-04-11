import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay/SegmentDisplay";
import ModeSelector from "./components/ModeSelector/ModeSelector";
import InputForm from "./components/InputForm/InputForm";
import MerchForm from "./components/MerchForm/MerchForm";
import VideoScanner from "./components/VideoScanner/VideoScanner";
import ErrorCorrectionSelector from "./components/ECSelector/ECSelector";
import { createBlocks } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./QRCodeMatrix";
import "./App.css";

function App() {
  const [mode, setMode] = useState("merch"); // Default to merch mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [bitStream, setBitStream] = useState(new TaggedBitstream());
  const [version, setVersion] = useState("auto");
  const [dataMask, setDataMask] = useState("auto");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("1");

  const selectUI = () => {
    if (mode === "merch") {
      return (
        <MerchForm
          setBitStream={setBitStream}
          version={version}
          setVersion={setVersion}
          dataMask={dataMask}
          setDataMask={setDataMask}
        />
      );
    } else if (mode === "scan") {
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
        setVersion={setVersion}
        dataMask={dataMask}
        setDataMask={setDataMask}
      />
    );
  };

  return (
    <div className="App">
      <div className="row">
        <h1>QR Code Generator</h1>
      </div>
      <div className="row">
        <div className="column">
          <div className="row">
            <ModeSelector mode={mode} setMode={setMode} />
          </div>
          <div className="row">
            <ErrorCorrectionSelector
              value={errorCorrectionLevel}
              onChange={setErrorCorrectionLevel}
            />
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
        <SegmentDisplay
          segments={segments}
          matrix={matrix}
          setMatrix={setMatrix}
        />
      </div>
    </div>
  );
}

export default App;
