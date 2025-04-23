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

import { QRDataProvider } from "../state";

import "../assets/styles/App.css";

export default function App() {
  const [inputMode, setInputMode] = useState("merch"); // Default to merch mode

  const selectUI = () => {
    if (inputMode === "merch") {
      return (
        <RecursiveSchemaEditor
          value={{
            type: "object",
            required: ["txn", "i"],
            properties: {
              txn: {
                type: "string",
              },
              i: {
                type: "array",
                items: {
                  type: "object",
                  required: ["v", "q"],
                  properties: {
                    v: {
                      type: "integer",
                    },
                    q: {
                      type: "integer",
                    },
                  },
                },
                uniqueItems: false,
              },
            },
          }}
          onChange={(schema) => {
            console.log("Schema changed:", schema);
          }}
        />
      );
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
