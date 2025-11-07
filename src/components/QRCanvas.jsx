import React from "react";
import { useQRDataDispatch } from "@/state/qr/QRDataContext";
import { QRBase } from "./QRBase";

export function QRCodeCanvas() {
  const { highlightSegment, highlightModules, clearHighlightedModules } = useQRDataDispatch();

  const handleModuleClick = (module) => {
    if (module?.bit?.sourceId) {
      highlightSegment(module.bit.sourceId);
    }
  };

  const handleModuleHover = (module) => {
    if (module?.bit?.id) {
      highlightModules([module.bit.id]);
    } else if (module === null) {
      // Mouse left the canvas
      clearHighlightedModules([]);
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
