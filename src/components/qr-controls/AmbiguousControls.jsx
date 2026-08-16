import { Switch } from "@/components/ui/switch";
import { ControlRow } from "./SettingsPanel";

export function AmbiguousControls({
  phaseFlip,
  onPhaseFlipChange,
  agreeCount,
  disagreeCount,
  version,
  dataMask,
  errorA,
  errorB,
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Differing modules are a 2×2 checkerboard so the module center sits on the
        quadrant cross. Both payloads share version, ECC, and mask.
      </p>
      <ControlRow label="Phase flip:" htmlFor="ambiguous-phase-flip">
        <Switch
          id="ambiguous-phase-flip"
          checked={phaseFlip}
          onCheckedChange={onPhaseFlipChange}
        />
        <span className="text-xs text-muted-foreground">
          Swap which diagonal belongs to Payload A
        </span>
      </ControlRow>
      <ControlRow label="Agree:">
        <span className="text-sm tabular-nums">{agreeCount ?? "—"}</span>
      </ControlRow>
      <ControlRow label="Disagree:">
        <span className="text-sm tabular-nums">{disagreeCount ?? "—"}</span>
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
