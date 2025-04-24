const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function InputModeSelector({ mode, onChange }) {
  return (
    <div className="order-encoding-selector">
      <label htmlFor="inputMode">Input Mode:</label>
      <select id="inputMode" value={modes} onChange={onChange}>
        {modes.map((mode, idx) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    </div>
  );
}
