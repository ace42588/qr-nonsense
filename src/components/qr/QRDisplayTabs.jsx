import { useState } from "react";
import { QRImageHalftone } from "../halftone/QRImageHalftone";
import { QRCodeCanvas } from "./QRCodeCanvas";
import { TabSwitcher } from "../shared/TabSwitcher";

export function QRDisplayTabs() {
  const [tab, setTab] = useState("default");

  return (
    <>
      <div>
        <TabSwitcher
          options={[
            { value: "default", label: "Vanilla" },
            { value: "halftone", label: "Halftone" },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === "default" ? <QRCodeCanvas /> : <QRImageHalftone />}
      </div>
    </>
  );
}
