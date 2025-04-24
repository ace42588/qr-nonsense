import { useState, useContext, useEffect, useCallback } from "react";
import "../styles/styles.css"; // Import your component-specific styles
import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "../selectors/Selectors";
import { useQRDataDispatch } from "../../state";
import { parseInput } from "./inputUtils";
import { Actions } from "../../domain/qr/Constants";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"]; // Available modes

export function InputForm({
  setBitStream,
  version,
  setVersion,
  dataMask,
  setDataMask,
  errorCorrectionLevel,
  setErrorCorrectionLevel,
}) {
  const [inputs, setInputs] = useState([{ type: "byte", value: "" }]);
  const [encoding, setEncoding] = useState("JSON");
  const dispatch = useQRDataDispatch();

  const updateQRData = useCallback(
    (inputValue = inputs, encodingType = encoding) => {
      const parsed = inputs.map((i) => parseInput(i));
      dispatch({
        type: Actions.ChangeInput,
        inputs: parsed,
      });
    },
    [dispatch, inputs, encoding]
  );

  useEffect(() => {
    updateQRData();
  }, [updateQRData]);

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].value = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, newMode) => {
    const newInputs = [...inputs];
    newInputs[index].type = newMode;
    if (newMode === "byte") {
      newInputs[index].encoding = "";
    } else {
      delete newInputs[index].encoding;
    }
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, { type: "byte", value: "" }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
  };

  const handleCheckboxChange = (input) => {
    if (input.encoding === "utf-8") {
      input.encoding = "";
    } else {
      input.encoding = "utf-8";
    }
    console.log("handleCheckboxChange", input);
  };

  const createCheckbox = (input) => {
    if (input.type === "byte") {
      return (
        <label>
          Force string encoding
          <input
            type="checkbox"
            value={inputs.encoding === "utf-8"}
            onChange={() => handleCheckboxChange(input)}
          />
        </label>
      );
    }
  };

  return (
    <form onSubmit={handleInputSubmit} className="input-form">
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
            <select
              value={input.type}
              onChange={(e) => handleModeChange(index, e.target.value)}
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={input.value}
              onChange={(e) => handleInputChange(index, e)}
              placeholder={`Input ${index + 1}`}
            />
            {createCheckbox(input)}
            <button type="button" onClick={() => handleRemoveInput(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={handleAddInput}>
          Add Input
        </button>
      </div>
    </form>
  );
}

export default InputForm;
