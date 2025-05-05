import { useState } from "react";
import {
  QRDisplayTabs,
  SegmentDisplay,
  VideoScanner,
  InputForm,
  MainViewTabs,
} from "../components";
import HalftoneDemo from "../components/halftone/HalftoneDemo";
import QRImageHalftone from "../components/halftone/QRImageHalftone";

import { QRDataProvider } from "../state";

import "../assets/styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("manual"); // Default to merch mode

  return (
    <div className="App">
      <div className="row">
        <h1>QR Code Generator</h1>
        <div className="row">
          <div className="mode-selector">
            <label>
              <input
                type="radio"
                value="scan"
                checked={inputMode === "scan"}
                onChange={() => setInputMode("scan")}
              />
              Scan QR Code
            </label>
            <label>
              <input
                type="radio"
                value="manual"
                checked={inputMode === "manual"}
                onChange={() => setInputMode("manual")}
              />
              Manual Input
            </label>
          </div>
        </div>
      </div>
      <QRDataProvider>
        <div className="row">
          <div className="column">
            <div className="row">
              <MainViewTabs />
            </div>
            <div className="row">
              {inputMode === "manual" && <InputForm />}
              {inputMode === "scan" && <VideoScanner />}
            </div>
          </div>
          <div className="column">
            <div className="row">
              <QRDisplayTabs />
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
