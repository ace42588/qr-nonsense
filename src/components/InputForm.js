import React, { useState } from 'react';

const inputModes = ['Numeric', 'Alphanumeric', 'Byte', 'Kanji'];

function InputForm({ onSubmit }) {
  const [inputData, setInputData] = useState('');
  const [inputMode, setInputMode] = useState(inputModes[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inputData, inputMode);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="data-input">Input Data:</label>
        <input
          type="text"
          id="data-input"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          required
        />
      </div>
      <div className="input-group">
        <label htmlFor="mode-select">Input Mode:</label>
        <select
          id="mode-select"
          value={inputMode}
          onChange={(e) => setInputMode(e.target.value)}
        >
          {inputModes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>
      <button type="submit">Generate QR Code</button>
    </form>
  );
}

export default InputForm;
