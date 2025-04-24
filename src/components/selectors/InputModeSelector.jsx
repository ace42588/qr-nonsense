const modes = [
  "numeric",
  "alphanumeric",
  "byte",
  //"kanji",
  "eci",
];

export function InputModeSelector({ mode, onChange }) {
  return (
    <div className="order-encoding-selector">
      <label htmlFor="inputMode">Input Mode:</label>
      <select id="inputMode" value={mode} onChange={onChange}>
        {modes.map((m, idx) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
