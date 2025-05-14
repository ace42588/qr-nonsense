import { useState } from "react";
import {
  QRDisplayTabs,
  SegmentDisplay,
  CodewordDisplay,
  MainViewTabs,
} from "../components";

import { InputProvider, QRDataProvider } from "../state";

import "../assets/styles/App.css";

export default function App() {
  return (
    <div className="App">
      <InputProvider>
      <QRDataProvider>
        <div className="row">
          <div className="column">
            <div className="row">
              <MainViewTabs />
            </div>
          </div>
          <div className="column">
            <div className="row">
              <QRDisplayTabs />
            </div>
          </div>
        </div>
        <div className="row">
          <SegmentDisplay />
        </div>
        <div className="row">
          <CodewordDisplay />
        </div>
      </QRDataProvider>
      </InputProvider>
    </div>
  );
}
