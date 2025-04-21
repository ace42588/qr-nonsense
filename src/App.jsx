import { useState, useReducer } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay";
import {
  ModeSelector,
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./components/Selectors";
import InputForm from "./components/InputForm";
import MerchForm from "./components/MerchForm";
import SchemaBuilder from "./components/SchemaBuilder"
import VideoScanner from "./components/VideoScanner";
import { QRDataProvider } from "./context/QRDataContext";

import "./styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode

  const selectUI = () => {
    if (inputMode === "merch") {
      return <SchemaBuilder />;
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
          </div>
          <div className="column">
            <QRCodeCanvas />
          </div>
        </div>
        <div className="row">
          <SegmentDisplay />
        </div>
      </QRDataProvider>
    </div>
  );
}
