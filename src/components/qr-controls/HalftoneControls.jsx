import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DOT_SIZE_MAX } from "@/domain/halftone/rendering";
import { ControlRow } from "./SettingsPanel";

export const DEFAULT_MIN_DOT = 0.25;
export const DEFAULT_MAX_DOT = 1.0;

/**
 * Shared halftone style + dot size controls (HQR, QArt, Combined).
 * Optional importance limiting is QArt-only via showImportance.
 */
export function HalftoneControls({
  idPrefix = "halftone",
  style,
  onStyleChange,
  minDotSize,
  maxDotSize,
  onMinDotChange,
  onMaxDotChange,
  showImportance = false,
  limitToImportant = false,
  onLimitToImportantChange,
  importanceThreshold = 0.3,
  onImportanceThresholdChange,
}) {
  const styleId = `${idPrefix}-style`;
  const minId = `${idPrefix}-min-dot`;
  const maxId = `${idPrefix}-max-dot`;
  const limitId = `${idPrefix}-limit-important`;
  const thresholdId = `${idPrefix}-importance-threshold`;

  const handleStyleChange = (next) => {
    onStyleChange(next);
  };

  const handleMinChange = (value) => {
    const next = parseFloat(value);
    onMinDotChange(next);
    if (next > maxDotSize) onMaxDotChange(next);
  };

  const handleMaxChange = (value) => {
    const next = parseFloat(value);
    onMaxDotChange(next);
    if (next < minDotSize) onMinDotChange(next);
  };

  return (
    <>
      <ControlRow label="Style:" htmlFor={styleId}>
        <Select value={style} onValueChange={handleStyleChange}>
          <SelectTrigger id={styleId} className="max-w-[12.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pattern">Pattern</SelectItem>
            <SelectItem value="dots">Dots</SelectItem>
          </SelectContent>
        </Select>
      </ControlRow>

      {style === "dots" && (
        <>
          <ControlRow label="Min size:" htmlFor={minId}>
            <input
              id={minId}
              type="range"
              min="0"
              max={DOT_SIZE_MAX}
              step="0.05"
              value={minDotSize}
              onChange={(e) => handleMinChange(e.target.value)}
              className="h-2 min-w-0 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <span className="min-w-10 text-xs text-muted-foreground">
              {minDotSize.toFixed(2)}
            </span>
          </ControlRow>
          <ControlRow label="Max size:" htmlFor={maxId}>
            <input
              id={maxId}
              type="range"
              min="0"
              max={DOT_SIZE_MAX}
              step="0.05"
              value={maxDotSize}
              onChange={(e) => handleMaxChange(e.target.value)}
              className="h-2 min-w-0 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <span className="min-w-10 text-xs text-muted-foreground">
              {maxDotSize.toFixed(2)}
            </span>
          </ControlRow>
        </>
      )}

      {showImportance && (
        <>
          <ControlRow
            label="Limit to Important:"
            htmlFor={limitId}
            hint="Apply halftone only to important image areas"
          >
            <Switch
              id={limitId}
              checked={limitToImportant}
              onCheckedChange={onLimitToImportantChange}
              title="Only apply halftone effect to important areas of the image (edges, details)"
            />
          </ControlRow>
          {limitToImportant && (
            <ControlRow
              label="Threshold:"
              htmlFor={thresholdId}
              className="ml-0 sm:ml-8"
              hint="Lower = more areas get halftone"
            >
              <input
                id={thresholdId}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={importanceThreshold}
                onChange={(e) =>
                  onImportanceThresholdChange(parseFloat(e.target.value))
                }
                className="h-2 min-w-0 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
              />
              <span className="min-w-10 text-xs text-muted-foreground">
                {importanceThreshold.toFixed(2)}
              </span>
            </ControlRow>
          )}
        </>
      )}
    </>
  );
}

/** Reset dot sizes when switching to dots style (call from parent onStyleChange). */
export function resetDotDefaults(setMin, setMax) {
  setMin(DEFAULT_MIN_DOT);
  setMax(DEFAULT_MAX_DOT);
}
