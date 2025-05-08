// MainViewTabs.jsx
import { useState } from "react";
import { InputForm } from "./InputForm";
import { VideoScanner } from "./VideoScanner";
import { TabSwitcher } from "./shared/TabSwitcher";
import { InputListProvider } from "../state";

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
      <InputListProvider>
        {tab === "input" ? <InputForm /> : <VideoScanner />}
      </InputListProvider>
    </div>
  );
}
