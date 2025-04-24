const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function InputModeSelector({ mode, onChange }) {
  return (
    <div className="order-encoding-selector">
      <label htmlFor="encoding">Encoding:</label>
      <select id="encoding" value={modes} onChange={onChange}>
        {modes.map((encoding, idx) => (
          <option key={encoding} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </div>
  );
}
