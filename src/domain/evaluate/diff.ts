/**
 * Compare two evaluation reports — signed improvement per metric.
 */

import type {
  EvaluationDiff,
  EvaluationReport,
  MetricDelta,
  MetricDirection,
  MetricValue,
} from "./types";

function signedImprovement(
  a: number,
  b: number,
  direction: MetricDirection
): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    if (a === b) return 0;
    if (!Number.isFinite(a) && Number.isFinite(b)) {
      return direction === "higherBetter" ? -1 : 1;
    }
    if (Number.isFinite(a) && !Number.isFinite(b)) {
      return direction === "higherBetter" ? 1 : -1;
    }
    return 0;
  }
  const raw = b - a;
  return direction === "higherBetter" ? raw : -raw;
}

/**
 * Diff reports by metric id. Positive signedImprovement means B is better.
 */
export function diffReports(
  a: EvaluationReport,
  b: EvaluationReport
): EvaluationDiff {
  const mapA = new Map(a.metrics.map((m) => [m.id, m]));
  const mapB = new Map(b.metrics.map((m) => [m.id, m]));
  const ids = new Set([...mapA.keys(), ...mapB.keys()]);
  const deltas: MetricDelta[] = [];

  for (const id of ids) {
    const ma = mapA.get(id);
    const mb = mapB.get(id);
    if (!ma || !mb) continue;
    deltas.push({
      id,
      a: ma.value,
      b: mb.value,
      signedImprovement: signedImprovement(ma.value, mb.value, ma.direction),
      direction: ma.direction,
    });
  }

  return { deltas };
}

/** Flatten report sections into the metrics array (idempotent helper). */
export function collectFlatMetrics(report: EvaluationReport): MetricValue[] {
  return report.metrics;
}
