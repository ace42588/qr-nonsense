import React from "react";
import { useQRDataDispatch } from "@/state/qr/QRDataContext";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";

export function QRCodeCanvas() {
  const { highlightSegment } = useQRDataDispatch();
  const handleModuleHover = useModuleHover();

  const handleModuleClick = (module) => {
    if (module?.bit?.sourceId) {
      highlightSegment(module.bit.sourceId);
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
