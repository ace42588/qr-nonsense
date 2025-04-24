import "../styles/styles.css"; // Import your component-specific styles
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  InputModeSelector,
} from "../selectors";

export function QRInfoInput() {
  return (
    <div className="row">
      <ErrorCorrectionSelector />
      <VersionSelector />
      <DataMaskSelector />
    </div>
  );
}
