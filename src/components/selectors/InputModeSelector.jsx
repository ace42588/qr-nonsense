const modes = [
  "numeric",
  "alphanumeric",
  "byte",
  //"kanji",
  "eci",
];

export function InputModeSelector({ mode, onChange }) {
  return (
    <div className="label-select-row">
      <label htmlFor="inputMode">Input Mode:</label>
      <select
        id="inputMode"
        value={mode}
        onChange={(e) => onChange({ value: e.target.value })}
      >
        {modes.map((m, idx) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      {mode === "byte" && (
        <>
          <label htmlFor="forceUtf8">Force UTF-8</label>
          <input
            id="forceUtf8"
            type="checkbox"
            checked={mode.encoding === "utf-8"}
            onChange={(e) =>
              onChange({
                value: mode,
                encoding: e.target.checked ? "utf-8" : undefined,
              })
            }
          />
        </>
      )}
    </div>
  );
}
