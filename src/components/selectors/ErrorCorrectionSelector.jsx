import { useState } from "react";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../domain/qr/Constants";

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
