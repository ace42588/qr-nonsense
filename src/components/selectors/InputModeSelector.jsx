const modes = [
  "numeric",
  "alphanumeric",
  "byte",
  //"kanji",
  "eci",
];

export function InputModeSelector({ mode, encoding, onChange }) {
  //console.debug("InputModeSelector", { mode });
  return (
    <div className="label-select-row">
      <label htmlFor="inputMode">Input Mode:</label>
      <select
        id="inputMode"
        value={mode}
        onChange={(e) => {
          console.debug("InputModeSelector", { e });
          onChange({ mode: e.target.value, encoding });
        }}
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
            checked={encoding === "utf-8"}
            onChange={(e) =>
              onChange({
                mode,
                encoding: e.target.checked ? "utf-8" : undefined,
              })
            }
          />
        </>
      )}
    </div>
  );
}
