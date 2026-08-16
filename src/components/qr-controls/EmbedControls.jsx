import { ControlRow } from "./SettingsPanel";

export function EmbedControls({
  version,
  dataMask,
  errorA,
  errorB,
  centerSeed,
  onCenterSeedChange,
  csfStrength,
  onCsfStrengthChange,
  polarityStrength,
  onPolarityStrengthChange,
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Soft embed: module outsides follow Payload A; a soft center “dot” follows
        Payload B (IS-QR-style fusion). DWT/CSF reduces high-frequency speckles.
        Both payloads share version, ECC, and mask.
      </p>

      <ControlRow label="Center dot:" htmlFor="embed-center-seed">
        <input
          id="embed-center-seed"
          type="range"
          min="0.15"
          max="1"
          step="0.01"
          value={centerSeed}
          onChange={(e) => onCenterSeedChange(parseFloat(e.target.value))}
          className="h-2 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {centerSeed.toFixed(2)}
        </span>
      </ControlRow>

      <ControlRow label="Polarity:" htmlFor="embed-polarity">
        <input
          id="embed-polarity"
          type="range"
          min="0.4"
          max="1"
          step="0.05"
          value={polarityStrength}
          onChange={(e) => onPolarityStrengthChange(parseFloat(e.target.value))}
          className="h-2 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {polarityStrength.toFixed(2)}
        </span>
      </ControlRow>

      <ControlRow label="CSF strength:" htmlFor="embed-csf">
        <input
          id="embed-csf"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={csfStrength}
          onChange={(e) => onCsfStrengthChange(parseFloat(e.target.value))}
          className="h-2 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {csfStrength.toFixed(2)}
        </span>
      </ControlRow>

      <ControlRow label="Version:">
        <span className="text-sm tabular-nums">{version ?? "—"}</span>
      </ControlRow>
      <ControlRow label="Mask:">
        <span className="text-sm tabular-nums">{dataMask ?? "—"}</span>
      </ControlRow>
      {errorA ? (
        <p className="text-sm text-destructive">Payload A: {errorA}</p>
      ) : null}
      {errorB ? (
        <p className="text-sm text-destructive">Payload B: {errorB}</p>
      ) : null}
    </>
  );
}
