import { useState, useReducer } from "react";
import QRCodeCanvas from "../components/qr/QRCodeCanvas";
import SegmentDisplay from "../components/qr/SegmentDisplay";
import {
  ModeSelector,
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "../components/selectors/Selectors";
import InputForm from "../components/forms/InputForm";
import MerchForm from "../components/forms/MerchForm";
import DynamicOrderEditor from "../components/forms/OrderEditor";
import VideoScanner from "../components/scanner/VideoScanner";
import { QRDataProvider } from "../state";
import QRMetaInfo from "../components/qr/QRInfo";

import "../assets/styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode

  const selectUI = () => {
    if (inputMode === "merch") {
      return <DynamicOrderEditor />;
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
