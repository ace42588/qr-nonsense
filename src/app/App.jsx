import { useState } from "react";
import {
  QRMetaInfo,
  QRCodeCanvas,
  SegmentDisplay,
  ModeSelector,
  VideoScanner,
  InputForm,
  MerchForm,
} from "../components";
import HalftoneDemo from "../components/halftone/HalftoneDemo";
import QRImageHalftone from "../components/halftone/QRImageHalftone";
import OrderBitFieldEditor from "../components/BitFieldEditor/OrderBitFieldEditor";

import { QRDataProvider } from "../state";

import "../assets/styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode

  const [fields, setFields] = useState([
    { id: "0", label: "platform", min: 0, max: 3 },
    { id: "1", label: "confId", min: 0, max: 255 },
    { id: "2", label: "transactionId", min: 0, max: 1048575 },
  ]);

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
            <OrderBitFieldEditor />
            <div className="row">{selectUI()}</div>
            <QRImageHalftone />
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
