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
  return (
    <div className="App">
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
            <div className="row">
              <SegmentDisplay />
            </div>
          </div>
        </div>
      </QRDataProvider>
    </div>
  );
}
