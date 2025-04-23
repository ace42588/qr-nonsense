import React from "react";
import { useQRData } from "../../state";

export function QRMetaInfo() {
  const { calculatedVersion, calculatedDataMask } = useQRData();
  
  console.debug("QRMetaInfo",{calculatedVersion, calculatedDataMask })

  return (
    <div className="qr-meta-info">
      <p>Calculated Version: {calculatedVersion}</p>
      {calculatedDataMask != null && (
        <p>Auto-Selected Data Mask: {calculatedDataMask}</p>
      )}
    </div>
  );
}