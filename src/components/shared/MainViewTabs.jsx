// MainViewTabs.jsx
import { useState } from "react";
import { InputForm } from "../forms/InputForm";
import { VideoScanner } from "../scanner/VideoScanner";

export function MainViewTabs() {
  const [tab, setTab] = useState("input");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("input")} disabled={tab === "input"}>Input Form</button>
        <button onClick={() => setTab("scanner")} disabled={tab === "scanner"}>Video Scanner</button>
      </div>

      {tab === "input" ? <InputForm /> : <VideoScanner />}
    </div>
  );
}
