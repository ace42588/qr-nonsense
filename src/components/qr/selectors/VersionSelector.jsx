import { useState } from "react";
import { Actions, useQRDataDispatch } from "../../state";

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
    <div className="label-select-row">
      <label htmlFor="qr-version">QR Code Version:</label>
      <select
        id="qr-version"
        value={version}
        onChange={(e) => {
          const newVersion = parseInt(e.target.value);
          setVersion(newVersion);
          dispatch({
            type: Actions.ChangeVersion,
            payload: { version: newVersion },
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
