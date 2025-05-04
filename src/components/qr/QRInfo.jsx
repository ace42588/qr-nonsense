import React from "react";
import { useQRData } from "../../state";

export function QRMetaInfo() {
  const { calculatedVersion, calculatedDataMask } = useQRData();

  return (
    <div className="row">
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <p>Calculated Version: {calculatedVersion}</p>
        {calculatedDataMask != null && (
          <p>Auto-Selected Data Mask: {calculatedDataMask}</p>
        )}
      </div>
    </div>
  );
}
