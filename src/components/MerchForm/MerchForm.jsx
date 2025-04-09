import React from "react";
import "./MerchForm.css"; // Import your component-specific styles

const modes = ["p1", "p2", "p3"]; // Available modes

// {"txn":"99999","i":[{"v":5432,"q":1},{"v":6666,"q":3},{"v":1234,"q":2}]}

const jsonLike = (order) => {
  const ENCAPSULATOR = "$";
  const FIELD_SEPARATOR = "%";
  const parseItem = (item) => {
    // QTY_SEPARATOR = ":";
    // TERMINATOR = "/";
    const { v, q } = item;
    return `${v}:${q}/`;
  }
  const {txn, conf, plat, i} = order;
  const items = i.map((item) => parseItem(item));
  return `$`
  
}

const parseInput = (input) => {
  const { type, value } = input;
  let order = JSON.parse(value);
  let parsedInput = {};

  switch (type) {
    case "p1": {
      parsedInput.type = "alphanumeric"
      parsedInput.text = jsonLike(order);
      break;
    }
    case "p2": {
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
