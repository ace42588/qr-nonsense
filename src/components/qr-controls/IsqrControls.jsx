import { Switch } from "@/components/ui/switch";
import { ControlRow } from "./SettingsPanel";

/**
 * IS-QR controls: ROI threshold, CSF/HVS, mask upload, metrics display.
 */
export function IsqrControls({
  roiThresholdBias,
  onRoiThresholdBiasChange,
  csfStrength,
  onCsfStrengthChange,
  printDpi,
  onPrintDpiChange,
  viewingDistanceInches,
  onViewingDistanceChange,
  qrBlend,
  onQrBlendChange,
  showRoi,
  onShowRoiChange,
  onMaskFileChange,
  hasMask,
  onClearMask,
  metrics,
  instanceCount,
  decodeSuccessRate,
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        ROI approximates BlendMask via saliency instances (browser).
      </p>

      <ControlRow
        label="Show ROI:"
        htmlFor="isqr-show-roi"
        hint="Overlay instance mask on modules"
      >
        <Switch
          id="isqr-show-roi"
          checked={showRoi}
          onCheckedChange={onShowRoiChange}
        />
      </ControlRow>

      <ControlRow label="ROI threshold:" htmlFor="isqr-roi-bias">
        <input
          id="isqr-roi-bias"
          type="range"
          min="-0.2"
          max="0.2"
          step="0.01"
          value={roiThresholdBias}
          onChange={(e) => onRoiThresholdBiasChange(parseFloat(e.target.value))}
          className="h-2 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {roiThresholdBias.toFixed(2)}
        </span>
      </ControlRow>

      <ControlRow label="CSF strength:" htmlFor="isqr-csf">
        <input
          id="isqr-csf"
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

      <ControlRow label="Print DPI:" htmlFor="isqr-dpi">
        <input
          id="isqr-dpi"
          type="number"
          min="72"
          max="600"
          step="1"
          value={printDpi}
          onChange={(e) => onPrintDpiChange(parseInt(e.target.value, 10) || 300)}
          className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
        />
      </ControlRow>

      <ControlRow label="View distance:" htmlFor="isqr-distance" hint="inches">
        <input
          id="isqr-distance"
          type="number"
          min="4"
          max="48"
          step="1"
          value={viewingDistanceInches}
          onChange={(e) =>
            onViewingDistanceChange(parseInt(e.target.value, 10) || 12)
          }
          className="h-8 w-24 rounded-md border bg-background px-2 text-sm"
        />
      </ControlRow>

      <ControlRow label="QR blend:" htmlFor="isqr-blend">
        <input
          id="isqr-blend"
          type="range"
          min="0.2"
          max="0.9"
          step="0.05"
          value={qrBlend}
          onChange={(e) => onQrBlendChange(parseFloat(e.target.value))}
          className="h-2 max-w-[12.5rem] flex-1 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {qrBlend.toFixed(2)}
        </span>
      </ControlRow>

      <ControlRow label="ROI mask:" htmlFor="isqr-mask">
        <input
          id="isqr-mask"
          type="file"
          accept="image/*"
          onChange={onMaskFileChange}
          className="max-w-[14rem] text-xs"
        />
        {hasMask ? (
          <button
            type="button"
            onClick={onClearMask}
            className="text-xs text-muted-foreground underline"
          >
            Clear
          </button>
        ) : null}
      </ControlRow>

      {(metrics || decodeSuccessRate != null || instanceCount != null) && (
        <div className="rounded-md border bg-background/80 p-3 text-xs">
          <div className="mb-2 font-semibold text-foreground">Quality metrics</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums text-muted-foreground">
            {decodeSuccessRate != null && (
              <>
                <span>Decode rate</span>
                <span>{(decodeSuccessRate * 100).toFixed(0)}%</span>
              </>
            )}
            {instanceCount != null && (
              <>
                <span>Instances</span>
                <span>{instanceCount}</span>
              </>
            )}
            {metrics && (
              <>
                <span>MSE</span>
                <span>{metrics.mse.toFixed(2)}</span>
                <span>PSNR</span>
                <span>
                  {Number.isFinite(metrics.psnr)
                    ? `${metrics.psnr.toFixed(2)} dB`
                    : "∞"}
                </span>
                <span>SSIM</span>
                <span>{metrics.ssim.toFixed(4)}</span>
                <span>FSIM</span>
                <span>{metrics.fsim.toFixed(4)}</span>
                <span>GMSD</span>
                <span>{metrics.gmsd.toFixed(4)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
