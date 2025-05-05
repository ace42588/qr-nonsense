import { useState } from "react";
import { QRImageHalftone } from "../halftone/QRImageHalftone";
import { QRCodeCanvas } from "./QRCodeCanvas";

export function QRDisplayTabs() {
  const [tab, setTab] = useState("canvas");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTab("canvas")} disabled={tab === "canvas"}>QR Canvas</button>
        <button onClick={() => setTab("halftone")} disabled={tab === "halftone"}>Halftone Preview</button>
      </div>

      {tab === "canvas" ? <QRCodeCanvas /> : <QRImageHalftone />}
    </div>
  );
}
