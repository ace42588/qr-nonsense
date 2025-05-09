// MainViewTabs.jsx
import { useState } from "react";
import { InputForm } from "./InputForm";
import { VideoScanner } from "./VideoScanner";
import { TabSwitcher } from "./shared/TabSwitcher";
import { InputProvider } from "../state";

export function MainViewTabs() {
  const [tab, setTab] = useState("input");

  return (
    <div>
      <TabSwitcher
        options={[
          { value: "input", label: "Input Form" },
          { value: "scanner", label: "Scanner" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "input" ? <InputForm /> : <VideoScanner />}
    </div>
  );
}
