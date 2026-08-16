/**
 * Thin UI summary for EvaluationReport metrics.
 */

function formatMetric(m) {
  if (m.id === "print.overallGradeRank" && m.details?.grade != null) {
    return String(m.details.grade);
  }
  if (m.unit === "ratio" || m.unit === "reflectance") {
    return m.value.toFixed(4);
  }
  if (m.unit === "dB") {
    return Number.isFinite(m.value) ? `${m.value.toFixed(2)} dB` : "∞";
  }
  if (
    m.unit === "score" ||
    m.unit === "errors" ||
    m.unit === "modules" ||
    m.unit === "bits"
  ) {
    return Number.isInteger(m.value) ? String(m.value) : m.value.toFixed(2);
  }
  if (m.unit === "luma^2") {
    return m.value.toFixed(2);
  }
  return Number.isFinite(m.value) ? m.value.toFixed(4) : String(m.value);
}

function labelFor(id) {
  const map = {
    "scannability.successRate": "Decode rate",
    "scannability.payloadMatchRate": "Payload match",
    "visual.meanAbsoluteError": "Visual error",
    "visual.polarityAgreement": "Polarity agree",
    "visual.contrastWeightedError": "Contrast-weighted err",
    "structure.penalty.total": "Mask penalty",
    "rs.remainingBudget": "RS remaining",
    "rs.worstBlockRemaining": "RS worst block",
    "rs.recovered.remainingBudget": "RS recovered remaining",
    "image.mse": "MSE",
    "image.psnr": "PSNR",
    "image.ssim": "SSIM",
    "image.fsim": "FSIM",
    "image.gmsd": "GMSD",
    "print.symbolContrast": "Symbol contrast",
    "print.modulation": "Modulation",
    "print.overallGradeRank": "Print grade",
    "dual.disagreementRatio": "Dual disagree",
    "structure.controlRatio": "Control ratio",
  };
  return map[id] ?? id;
}

const DEFAULT_IDS = [
  "scannability.successRate",
  "scannability.payloadMatchRate",
  "visual.meanAbsoluteError",
  "visual.polarityAgreement",
  "structure.penalty.total",
  "rs.remainingBudget",
  "image.mse",
  "image.psnr",
  "image.ssim",
  "image.fsim",
  "image.gmsd",
  "print.overallGradeRank",
  "dual.disagreementRatio",
];

export function EvaluationSummary({
  evaluation,
  metrics,
  decodeSuccessRate,
  instanceCount,
  metricIds = DEFAULT_IDS,
  className,
}) {
  const rows = [];

  if (evaluation) {
    const byId = new Map(evaluation.metrics.map((m) => [m.id, m]));
    for (const id of metricIds) {
      const m = byId.get(id);
      if (!m) continue;
      rows.push({ label: labelFor(id), value: formatMetric(m) });
    }
    if (instanceCount != null) {
      rows.push({ label: "Instances", value: String(instanceCount) });
    }
  } else {
    if (decodeSuccessRate != null) {
      rows.push({
        label: "Decode rate",
        value: `${(decodeSuccessRate * 100).toFixed(0)}%`,
      });
    }
    if (instanceCount != null) {
      rows.push({ label: "Instances", value: String(instanceCount) });
    }
    if (metrics) {
      rows.push({ label: "MSE", value: metrics.mse.toFixed(2) });
      rows.push({
        label: "PSNR",
        value: Number.isFinite(metrics.psnr)
          ? `${metrics.psnr.toFixed(2)} dB`
          : "∞",
      });
      rows.push({ label: "SSIM", value: metrics.ssim.toFixed(4) });
      rows.push({ label: "FSIM", value: metrics.fsim.toFixed(4) });
      rows.push({ label: "GMSD", value: metrics.gmsd.toFixed(4) });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div
      className={
        className ?? "rounded-md border bg-background/80 p-3 text-xs"
      }
    >
      <div className="mb-2 font-semibold text-foreground">Quality metrics</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums text-muted-foreground">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <span>{r.label}</span>
            <span className="break-words">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
