import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css"; // Import your component-specific styles
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
  InputModeSelector,
} from "../selectors";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../domain/qr/Constants";

export function InputForm({
  setBitStream,
  version,
  setVersion,
  dataMask,
  setDataMask,
  errorCorrectionLevel,
  setErrorCorrectionLevel,
}) {
  const [inputs, setInputs] = useState([
    { mode: "byte", data: "Hello world!" },
  ]);
  const dispatch = useQRDataDispatch();

  const updateQRData = useCallback(
    (inputValue = inputs) => {
      const parsed = inputs.map((i) => parseInput(i));
      console.debug("updateQRData", { inputValue });
      dispatch({
        type: Actions.ChangeInput,
        inputs: parsed,
      });
    },
    [dispatch, inputs]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].data = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, event) => {
    const newMode = event.target.value;
    console.debug("handleModeChange", { index, newMode });
    const newInputs = [...inputs];
    newInputs[index].mode = newMode;
    if (newMode === "byte") {
      newInputs[index].encoding = "";
    } else {
      delete newInputs[index].encoding;
    }
    setInputs(newInputs);
  };

  const handleCheckboxChange = (input) => {
    if (input.encoding === "utf-8") {
      input.encoding = "";
    } else {
      input.encoding = "utf-8";
    }
  };

  const handleAddInput = () => {
    setInputs([...inputs, { mode: "byte", value: "" }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  return (
    <div className="input-form">
      <div className="row">
        <ErrorCorrectionSelector />
      </div>
      <div className="row">
        <VersionSelector />
      </div>
      <div className="row">
        <DataMaskSelector />
      </div>
      <div className="row">
        {inputs.map((input, index) => (
          <div key={index} className="input-group">
            <InputModeSelector
              mode={input.mode}
              onChange={(e) => handleModeChange(index, e)}
            />
            <input
              type="text"
              value={input.data}
              onChange={(e) => handleInputChange(index, e)}
              placeholder={`Input ${index + 1}`}
            />
            {input.type === "byte" && (
              <label>
                Force bytes
                <input
                  type="checkbox"
                  value={inputs.encoding === "utf-8"}
                  onChange={() => handleCheckboxChange(input)}
                />
              </label>
            )}
            <button type="button" onClick={() => handleRemoveInput(index)}>
              ✖
            </button>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={handleAddInput}>
          Add Input
        </button>
      </div>
    </div>
  );
}

export default InputForm;
