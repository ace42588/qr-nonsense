import { useState } from "react";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../state/qr/Constants";

export function ModeSelector({ mode, setMode }) {
  return (
    <div className="mode-selector">
      <label>
        <input
          type="radio"
          value="scan"
          checked={mode === "scan"}
          onChange={() => setMode("scan")}
        />
        Scan QR Code
      </label>
      <label>
        <input
          type="radio"
          value="manual"
          checked={mode === "manual"}
          onChange={() => setMode("manual")}
        />
        Manual Input
      </label>
      <label>
        <input
          type="radio"
          value="merch"
          checked={mode === "merch"}
          onChange={() => setMode("merch")}
        />
        Merch Input
      </label>
    </div>
  );
}

const levels = [
  { label: "Low (L) – 7% redundancy", value: 0 },
  { label: "Medium (M) – 15% redundancy", value: 1 },
  { label: "Quartile (Q) – 25% redundancy", value: 2 },
  { label: "High (H) – 30% redundancy", value: 3 },
];

export function ErrorCorrectionSelector() {
  const [ecLevel, setEcLevel] = useState(0);
  const dispatch = useQRDataDispatch();
  return (
    <div className="error-correction-selector">
      <label htmlFor="ec-level">Error Correction Level:</label>
      <select
        id="ec-level"
        value={ecLevel}
        onChange={(e) => {
          const newEcLevel = parseInt(e.target.value);
          setEcLevel(newEcLevel);
          dispatch({
            type: Actions.ChangeErrorCorretionLevel,
            errorCorrectionLevel: newEcLevel,
          });
        }}
      >
        {levels.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const versions = [{ label: "Auto", value: -1 }].concat(
  Array.from({ length: 40 }, (_, i) => ({
    label: `Version ${i + 1}`,
    value: i + 1,
  }))
);

export function VersionSelector() {
  const [version, setVersion] = useState(-1);
  const dispatch = useQRDataDispatch();
  return (
    <div className="version-selector">
      <label htmlFor="qr-version">QR Code Version:</label>
      <select
        id="qr-version"
        value={version}
        onChange={(e) => {
          const newVersion = parseInt(e.target.value);
          setVersion(newVersion);
          dispatch({
            type: Actions.ChangeVersion,
            version: newVersion,
          });
        }}
      >
        {versions.map((ver) => (
          <option key={ver.value} value={ver.value}>
            {ver.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const masks = [
  { label: "Auto", value: -1 },
  { label: "Mask 0", value: 0 },
  { label: "Mask 1", value: 1 },
  { label: "Mask 2", value: 2 },
  { label: "Mask 3", value: 3 },
  { label: "Mask 4", value: 4 },
  { label: "Mask 5", value: 5 },
  { label: "Mask 6", value: 6 },
  { label: "Mask 7", value: 7 },
];

export function DataMaskSelector() {
  const [dataMask, setDataMask] = useState(-1);
  const dispatch = useQRDataDispatch();
  return (
    <div className="data-mask-selector">
      <label htmlFor="data-mask">Data Mask:</label>
      <select
        id="data-mask"
        value={dataMask}
        onChange={(e) => {
          const newDataMask = parseInt(e.target.value);
          setDataMask(newDataMask);
          dispatch({
            type: Actions.ChangeDataMask,
            dataMask: newDataMask,
          });
        }}
      >
        {masks.map((mask) => (
          <option key={mask.value} value={mask.value}>
            {mask.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const Encodings = ["JSON", "Alphanumeric", "PER", "PER-ModHex", "PER-NTRU"];
export function OrderEncodingSelector({ encoding, setEncoding, onChange }) {
  const handleChange = (e) => {
    const newEncoding = e.target.value;
    setEncoding(newEncoding);
  };

  return (
    <div className="order-encoding-selector">
      <label htmlFor="encoding">Encoding:</label>
      <select id="encoding" value={encoding} onChange={handleChange}>
        {Encodings.map((encoding, idx) => (
          <option key={encoding} value={encoding}>
            {encoding}
          </option>
        ))}
      </select>
    </div>
  );
}
