import React, { useState } from 'react';

const inputModes = ['Numeric', 'Alphanumeric', 'Byte', 'Kanji'];

function InputForm({ inputs, onInputChange, onAddInput, onRemoveInput, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="input-form">
      <h3>Manual Inputs</h3>
      {inputs.map((input, index) => (
        <div key={index} className="input-group">
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
