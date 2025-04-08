import React from "react";
import "./MerchForm.css"; // Import your component-specific styles

const modes = ["p1", "p2", "p3"]; // Available modes

const parseInput = (input) => {
  let { type, value, encoding } = input;
  let parsedInput = { type };

  switch (type) {
    case "p1": {
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

  const handleInputSubmit = (event) => {
    event.preventDefault();
    const chunks = inputs.map((i) => parseInput(i));
    const version = 1;
    const formatInfo = { errorCorrectionLevel: 1, dataMask: 1 };
    processQRCodeData({ chunks, version, formatInfo });
  };

  return (
    <form onSubmit={handleInputSubmit} className="input-form">
      <div className="row">
        <h3>Manual Inputs</h3>
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

          </div>
        ))}
      </div>
      <div className="row">
        <button type="submit">Generate QR Code</button>
      </div>
    </form>
  );
}

export default InputForm;
