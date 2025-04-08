import React from "react";
import "./InputForm.css"; // Import your component-specific styles

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"]; // Available modes

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
    const newValue = event.target.value;
    const { type } = newInputs[index];
    let parsedInput
    
    switch (type) {
      case "numeric": {
        const regex = /\d+/gm;
        const match = newValue.match(regex);
        parsedInput = match ? match.join("") : "";
        break;
      }
      case "alphanumeric": {
        const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
        let upperCase = newValue.toUpperCase();
        const match = upperCase.match(regex);
        parsedInput = match ? match.join("") : "";
        break;
        }
      case "byte": {
        const binRE = /[01 ]+/gm;
        const hexRE = /(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)/ig;
        
      }
      default: {
        parsedInput = newValue;
      }
      
    
    newInputs[index].value = parsedInput;
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
    const chunks = inputs.map((input) => ({ type: "byte", text: input.value }));
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
