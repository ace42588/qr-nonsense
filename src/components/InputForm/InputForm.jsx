import React from "react";
import "./InputForm.css"; // Import your component-specific styles

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"]; // Available modes

const parseInput = (input) => {
  console.log("parseInput", { input });
  const { type, value } = input;
  console.log("parseInput", { value, type });
  let parsedValue;
  let parsedInput = { type };

  switch (type) {
    case "numeric": {
      const regex = /\d+/gm;
      const match = value.match(regex);
      parsedValue = match ? match.join("") : "";
      break;
    }
    case "alphanumeric": {
      const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
      let upperCase = value.toUpperCase();
      const match = upperCase.match(regex);
      parsedValue = match ? match.join("") : "";
      break;
    }
    case "byte": {
      const isBinary = (str) =>
        /^(?:0b)?(?:[01]{8}(?:\s+[01]{8})+|(?:[01]{8})+)$/i.test(str);
      const isHex = (str) =>
        /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(
          str
        );

      let hex = "";

      if (isBinary(value)) {
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
      } else if (isHex(value)) {
        let hex = value.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 8 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
      }

      if (hex !== "") {
        parsedInput.encoding = "hex";
        parsedValue = hex;
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        parsedInput.encoding = "utf-8";
        parsedValue = value;
      }
    }
    default: {
      parsedValue = value;
    }
  }

  parsedInput.value = parsedValue;
  return parsedInput;
};

/*
inputs={inputs}
onInputChange={handleInputChange}
onModeChange={handleModeChange}
onAddInput={handleAddInput}
onRemoveInput={handleRemoveInput}
onSubmit={handleInputSubmit}
function InputForm({
  inputs,
  onInputChange,
  onModeChange,
  onAddInput,
  onRemoveInput,
  onSubmit,
}) {
*/

function InputForm({ inputs, setInputs, processQRCodeData }) {
  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].value = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, newMode) => {
    const newInputs = [...inputs];
    newInputs[index].type = newMode;
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, { type: "text", value: "" }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
    const chunks = inputs.map((i) => {
      const parsed = parseInput(i);
      console.log({ parsed });
      const { type, value, encoding } = parsed;
      return { type, text: value };
    });
    const version = 1;
    const formatInfo = { errorCorrectionLevel: 1, dataMask: 1 };
    processQRCodeData({ chunks, version, formatInfo });
  };

  return (
    <form onSubmit={handleInputSubmit} className="input-form">
      <div class="row">
        <h3>Manual Inputs</h3>
      </div>
      <div class="row">
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
            <button type="button" onClick={() => handleRemoveInput(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div class="row">
        <button type="button" onClick={handleAddInput}>
          Add Input
        </button>
        <button type="submit">Generate QR Code</button>
      </div>
    </form>
  );
}

export default InputForm;
