import React from "react";
import { useQRDataDispatch } from "@/state/qr/QRDataContext";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";

export function QRCodeCanvas() {
  const { highlightSegment, toggleDamageModule, highlightModules } =
    useQRDataDispatch();
  const handleModuleHover = useModuleHover();

  const handleModuleClick = (module) => {
    if (!module?.id) {
      if (module?.bit?.sourceId) {
        highlightSegment(module.bit.sourceId);
      }
      return;
    }

    // Damage any module (data/EC or structural)
    toggleDamageModule(module.id);
    const bitId = module?.bit?.id || module?.bitId;
    if (bitId) {
      highlightModules([bitId]);
    }
  };

  return (
    <div className="qr-code-canvas-container">
      <QRBase
        size={420}
        onModuleClick={handleModuleClick}
        onModuleHover={handleModuleHover}
      />
    </div>
  );
}
