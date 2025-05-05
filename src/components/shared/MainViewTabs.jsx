// MainViewTabs.jsx
import { useState } from "react";
import { InputForm } from "../forms/InputForm";
import { VideoScanner } from "../scanner/VideoScanner";
import { TabSwitcher } from "./TabSwitcher";

export function MainViewTabs() {
  const [tab, setTab] = useState("input");

  return (
    <div>
      <TabSwitcher options={[{value: "input", label: "Input Form"}, {value: "scanner", label: "Scanner"}]} active={tab} onChange={setTab} />
      {tab === "input" ? <InputForm /> : <VideoScanner />}
    </div>
  );
}
