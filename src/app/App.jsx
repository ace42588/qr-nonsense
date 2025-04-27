import { useState } from "react";
import {
  QRMetaInfo,
  QRCodeCanvas,
  SegmentDisplay,
  ModeSelector,
  VideoScanner,
  InputForm,
  DynamicOrderEditor,
  MerchForm,
  RecursiveSchemaEditor,
} from "../components";
import HalftoneDemo from "../components/halftone/HalftoneDemo";

import { QRDataProvider } from "../state";

import "../assets/styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode

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
      <QRDataProvider>
        <div className="row">
          <div className="column">
            <div className="row">{selectUI()}</div>
            <HalftoneDemo />
          </div>
          <div className="column">
            <div className="row">
              <QRCodeCanvas />
            </div>
            <div className="row">
              <QRMetaInfo />
            </div>
            <div className="row">
              <SegmentDisplay />
            </div>
          </div>
        </div>
      </QRDataProvider>
    </div>
  );
}
