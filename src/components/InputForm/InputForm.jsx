import React, { useState } from "react";
import "./InputForm.css"; // Import your component-specific styles

import VersionSelector from "../VersionSelector/VersionSelector";
import DataMaskSelector from "../DataMaskSelector/DataMaskSelector";
import ErrorCorrectionSelector from "../ECSelector/ECSelector";
import { getMinimumQRCodeVersion} from "../../encode/version.js";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"]; // Available modes

const parseInput = (input) => {
  let { type, value, encoding } = input;
  let parsedInput = { type };

  switch (type) {
    case "numeric": {
      const regex = /\d+/gm;
      const match = value.match(regex);
      parsedInput.text = match ? match.join("") : "";
      break;
    }
    case "alphanumeric": {
      const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
      let upperCase = value.toUpperCase();
      const match = upperCase.match(regex);
      parsedInput.text = match ? match.join("") : "";
      break;
    }
    case "byte": {
      const isBinary = (str) =>
        /^(?:0b)?(?:[01]{8}(?:\s+[01]{8})+|(?:[01]{8})+)$/i.test(str);
      const isHex = (str) =>
        /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(
          str
        );
      const forceUtf = encoding === "utf-8";

      if (isBinary(value) && !forceUtf) {
        let hex = "";
        let bin = value.replace(/^0b/i, "");
        bin = bin.replace(/\s+/g, "");

        if (bin.length % 8 !== 0) {
          throw new Error(
            "Invalid binary string: length must be byte aligned."
          );
        }

        for (let i = 0; i < bin.length; i += 4) {
          let val = parseInt(bin.substring(i, i + 4), 2);
          hex = hex.concat(val.toString(16));
        }
        parsedInput.encoding = "hex";
        parsedInput.bytes = hex;
      } else if (isHex(value) && !forceUtf) {
        let hex = value.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
        parsedInput.encoding = "hex";
        parsedInput.bytes = hex;
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        parsedInput.encoding = "utf-8";
        parsedInput.text = value;
      }

      break;
    }
    default: {
      parsedInput.text = value;
    }
  }

  return parsedInput;
};

function InputForm({ inputs, setInputs, processQRCodeData }) {
  const [errorCorrection, setErrorCorrection] = useState("M");
  const [version, setVersion] = useState("auto");
  const [mask, setMask] = useState("auto");
  
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
    const chunks = inputs.map((i) => parseInput(i));
    const version = getMinimumQRCodeVersion(chunks, errorCorrection);
    const formatInfo = { errorCorrectionLevel: 1, dataMask: 1 };
    processQRCodeData({ chunks, version, formatInfo });
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
        <h3>Manual Inputs</h3>
      </div>
      <div className="row">
        <ErrorCorrectionSelector
          value={errorCorrection}
          onChange={setErrorCorrection}
        />
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
        <button type="submit">Generate QR Code</button>
      </div>
    </form>
  );
}

export default InputForm;
