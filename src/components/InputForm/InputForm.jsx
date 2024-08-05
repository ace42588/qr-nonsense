import React from 'react';
import './InputForm.css'; // Import your component-specific styles

const modes = ['numeric', 'alphanumeric', 'byte', 'kanji', 'eci']; // Available modes

function InputForm({ inputs, onInputChange, onModeChange, onAddInput, onRemoveInput, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="input-form">
      <h3>Manual Inputs</h3>
      {inputs.map((input, index) => (
        <div key={index} className="input-group">
          <select
            value={input.type}
            onChange={(e) => onModeChange(index, e.target.value)}
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
            onChange={(e) => onInputChange(index, e)}
            placeholder={`Input ${index + 1}`}
          />
          <button type="button" onClick={() => onRemoveInput(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={onAddInput}>
        Add Input
      </button>
      <button type="submit">Generate QR Code</button>
    </form>
  );
}

export default InputForm;
