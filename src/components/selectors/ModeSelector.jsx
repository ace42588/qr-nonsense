export function ModeSelector({ mode, setMode }) {
  return (
    <div className="mode-selector">
      <label>
        <input
          type="radio"
          value="scan"
          checked={mode === "scan"}
          onChange={() => setMode("scan")}
        />
        Scan QR Code
      </label>
      <label>
        <input
          type="radio"
          value="manual"
          checked={mode === "manual"}
          onChange={() => setMode("manual")}
        />
        Manual Input
      </label>
      <label>
        <input
          type="radio"
          value="merch"
          checked={mode === "merch"}
          onChange={() => setMode("merch")}
        />
        Merch Input
      </label>
    </div>
  );
}
