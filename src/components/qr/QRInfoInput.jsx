import "../styles/styles.css"; // Import your component-specific styles
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "../selectors";

export function QRInfoInput() {
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
        <ErrorCorrectionSelector />
        <VersionSelector />
        <DataMaskSelector />
      </div>
    </div>
  );
}
