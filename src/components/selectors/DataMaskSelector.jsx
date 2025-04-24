import { useState } from "react";
import { useQRDataDispatch } from "../../state";
import { Actions } from "../../domain/qr/Constants";

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
    <div className="label-select-row">
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
