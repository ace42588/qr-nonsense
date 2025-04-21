import { useQRData } from "../context/QRDataContext";

export default function QRMetaInfo() {
  const { calculatedVersion, calculatedDataMask } = useQRData();

  return (
    <div className="qr-meta-info">
      <p>Calculated Version: {calculatedVersion}</p>
      {calculatedDataMask != null && (
        <p>Auto-Selected Data Mask: {calculatedDataMask}</p>
      )}
    </div>
  );
}