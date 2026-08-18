/**
 * Unified evaluation entry point for generated QR artifacts.
 */

import { countAgreement } from "@/domain/ambiguous";
import { checkVersionCapacityForQArt } from "@/domain/qart/capacity";
import { resizeImageDataNearest } from "@/domain/image";
import { calculateMaskPenalty } from "./maskPenalty";
import { computeRsRemainingBudget } from "./rsBudget";
import { computeVisualFidelity } from "./visual";
import { computeImageQualityMetrics } from "./imageMetrics";
import { computePrintQuality, recoverFlippedBitIds } from "./printQuality";
import type {
  DecodeTrialResult,
  EvaluateDeps,
  EvaluateInput,
  EvaluationReport,
  MetricValue,
  ScannabilityResult,
  ScannabilityTrial,
} from "./types";

function pushMetric(metrics: MetricValue[], m: MetricValue): void {
  metrics.push(m);
}

function trialsToScannability(
  trials: DecodeTrialResult[],
  expected: string | null | undefined,
  source: ScannabilityResult["source"]
): ScannabilityResult {
  const detailed: ScannabilityTrial[] = trials.map((t, i) => ({
    trial: i,
    success: t.success,
    payload: t.payload,
    matchedExpected:
      expected == null
        ? null
        : t.payload != null && t.payload === expected,
  }));
  const successCount = detailed.filter((t) => t.success).length;
  const matchCount = detailed.filter((t) => t.matchedExpected === true).length;
  return {
    successRate: trials.length > 0 ? successCount / trials.length : 0,
    payloadMatchRate:
      expected == null || trials.length === 0
        ? null
        : matchCount / trials.length,
    trials: detailed,
    source,
  };
}

/**
 * Evaluate a generated QR (and optional render / dual matrices).
 * Sections are omitted when required inputs are missing.
 */
export async function evaluateGeneratedQr(
  input: EvaluateInput,
  deps: EvaluateDeps = {}
): Promise<EvaluationReport> {
  const matrix = input.matrix;
  const dimension = matrix.length;
  const version =
    input.versionInfo?.version ??
    input.version ??
    Math.max(1, Math.round((dimension - 17) / 4));
  const errorCorrectionLevel = input.errorCorrectionLevel ?? 0;
  const dataMask =
    typeof input.dataMask === "number" ? input.dataMask : null;
  const quietZone = input.quietZone ?? 4;
  const trials =
    Number.isFinite(input.decodeTrials) && (input.decodeTrials as number) > 0
      ? (input.decodeTrials as number)
      : 1;
  const threshold =
    Number.isFinite(input.minDecodeRedundancy) &&
    (input.minDecodeRedundancy as number) >= 0 &&
    (input.minDecodeRedundancy as number) <= 1
      ? (input.minDecodeRedundancy as number)
      : 0.8;

  const metrics: MetricValue[] = [];
  const report: EvaluationReport = {
    identity: {
      version,
      errorCorrectionLevel,
      dataMask,
      dimension,
      moduleCount: dimension * dimension,
    },
    metrics,
  };

  // Structure — always available from matrix
  const penalty = calculateMaskPenalty(matrix);
  report.structure = { penalty };
  pushMetric(metrics, {
    id: "structure.penalty.total",
    value: penalty.total,
    unit: "score",
    direction: "lowerBetter",
    details: {
      n1: penalty.n1,
      n2: penalty.n2,
      n3: penalty.n3,
      n4: penalty.n4,
    },
  });
  pushMetric(metrics, {
    id: "structure.penalty.n1",
    value: penalty.n1,
    unit: "score",
    direction: "lowerBetter",
  });
  pushMetric(metrics, {
    id: "structure.penalty.n2",
    value: penalty.n2,
    unit: "score",
    direction: "lowerBetter",
  });
  pushMetric(metrics, {
    id: "structure.penalty.n3",
    value: penalty.n3,
    unit: "score",
    direction: "lowerBetter",
  });
  pushMetric(metrics, {
    id: "structure.penalty.n4",
    value: penalty.n4,
    unit: "score",
    direction: "lowerBetter",
  });

  if (input.controlledBits && input.controlledBits.size > 0) {
    let controlled = 0;
    for (const v of input.controlledBits.values()) {
      if (v) controlled++;
    }
    const controlRatio = controlled / input.controlledBits.size;
    report.structure.controlRatio = controlRatio;
    pushMetric(metrics, {
      id: "structure.controlRatio",
      value: controlRatio,
      unit: "ratio",
      direction: "higherBetter",
    });
  }

  // Reed-Solomon
  if (input.blocks && input.blocks.length > 0) {
    report.reedSolomon = computeRsRemainingBudget(input.blocks);
    pushMetric(metrics, {
      id: "rs.remainingBudget",
      value: report.reedSolomon.remainingBudget,
      unit: "errors",
      direction: "higherBetter",
    });
    pushMetric(metrics, {
      id: "rs.worstBlockRemaining",
      value: report.reedSolomon.worstBlockRemaining,
      unit: "errors",
      direction: "higherBetter",
    });
  }

  // Visual
  if (input.targetGrid && input.targetGrid.length >= dimension * dimension) {
    report.visual = computeVisualFidelity(
      matrix,
      input.targetGrid,
      dimension,
      input.contrastGrid
    );
    pushMetric(metrics, {
      id: "visual.meanAbsoluteError",
      value: report.visual.meanAbsoluteError,
      unit: "ratio",
      direction: "lowerBetter",
      details: { mismatchCount: report.visual.mismatchCount },
    });
    pushMetric(metrics, {
      id: "visual.polarityAgreement",
      value: report.visual.polarityAgreement,
      unit: "ratio",
      direction: "higherBetter",
    });
    if (report.visual.contrastWeightedError != null) {
      pushMetric(metrics, {
        id: "visual.contrastWeightedError",
        value: report.visual.contrastWeightedError,
        unit: "ratio",
        direction: "lowerBetter",
      });
    }
  }

  // Image metrics (optional — can be filled in by a follow-up worker job)
  if (
    !input.deferImageMetrics &&
    input.referenceImage &&
    input.renderedImage
  ) {
    let ref = input.referenceImage;
    const rendered = input.renderedImage;
    if (ref.width !== rendered.width || ref.height !== rendered.height) {
      ref = resizeImageDataNearest(
        ref,
        Math.max(rendered.width, rendered.height)
      );
      if (ref.width !== rendered.width || ref.height !== rendered.height) {
        // nearest resize to square; if still mismatched, skip
        ref = resizeImageDataNearest(input.referenceImage, rendered.width);
      }
    }
    if (ref.width === rendered.width && ref.height === rendered.height) {
      report.image = computeImageQualityMetrics(ref, rendered);
      pushMetric(metrics, {
        id: "image.mse",
        value: report.image.mse,
        unit: "luma^2",
        direction: "lowerBetter",
      });
      pushMetric(metrics, {
        id: "image.psnr",
        value: Number.isFinite(report.image.psnr) ? report.image.psnr : 1e9,
        unit: "dB",
        direction: "higherBetter",
      });
      pushMetric(metrics, {
        id: "image.ssim",
        value: report.image.ssim,
        unit: "ratio",
        direction: "higherBetter",
      });
      pushMetric(metrics, {
        id: "image.fsim",
        value: report.image.fsim,
        unit: "ratio",
        direction: "higherBetter",
      });
      pushMetric(metrics, {
        id: "image.gmsd",
        value: report.image.gmsd,
        unit: "ratio",
        direction: "lowerBetter",
      });
    }
  }

  // Print quality + recovered RS
  if (input.renderedImage) {
    report.print = computePrintQuality(
      input.renderedImage,
      matrix,
      quietZone
    );
    for (const m of [
      report.print.symbolContrast,
      report.print.modulation,
      report.print.fixedPatternDamage,
      report.print.axialNonuniformity,
      report.print.gridNonuniformity,
      report.print.formatInformationDamage,
    ]) {
      pushMetric(metrics, m);
    }
    pushMetric(metrics, {
      id: "print.overallGradeRank",
      value: { A: 4, B: 3, C: 2, D: 1, F: 0 }[report.print.overallGrade],
      unit: "grade",
      direction: "higherBetter",
      details: { grade: report.print.overallGrade },
    });

    if (input.blocks && input.blocks.length > 0) {
      const flipped = recoverFlippedBitIds(
        input.renderedImage,
        matrix,
        quietZone
      );
      report.recoveredReedSolomon = computeRsRemainingBudget(
        input.blocks,
        flipped
      );
      pushMetric(metrics, {
        id: "rs.recovered.remainingBudget",
        value: report.recoveredReedSolomon.remainingBudget,
        unit: "errors",
        direction: "higherBetter",
        details: { flippedBits: flipped.length },
      });
    }
  }

  // Dual
  if (input.matrixA && input.matrixB) {
    const stats = countAgreement(input.matrixA, input.matrixB);
    const disagreementRatio =
      stats.totalModules > 0
        ? stats.disagreeCount / stats.totalModules
        : 0;
    report.dual = { ...stats, disagreementRatio };
    pushMetric(metrics, {
      id: "dual.disagreementRatio",
      value: disagreementRatio,
      unit: "ratio",
      direction: "lowerBetter",
    });
    pushMetric(metrics, {
      id: "dual.agreeCount",
      value: stats.agreeCount,
      unit: "modules",
      direction: "higherBetter",
    });
  }

  // Capacity
  if (
    input.versionInfo &&
    input.targetImageForCapacity &&
    typeof input.userInputBits === "number"
  ) {
    const cap = checkVersionCapacityForQArt(
      input.versionInfo,
      input.userInputBits,
      input.targetImageForCapacity
    );
    report.capacity = {
      availableCapacity: cap.availableCapacity,
      qartRequirement: cap.qartRequirement,
      hasCapacity: cap.hasCapacity,
    };
    pushMetric(metrics, {
      id: "capacity.available",
      value: cap.availableCapacity,
      unit: "bits",
      direction: "higherBetter",
    });
  }

  // Scannability via injected decode port
  const scannability: ScannabilityResult[] = [];
  if (deps.decode) {
    const matrixTrials = await deps.decode.decodeMatrixTrials(matrix, trials);
    scannability.push(
      trialsToScannability(matrixTrials, input.expectedPayload, "matrix")
    );

    if (input.matrixA) {
      const aTrials = await deps.decode.decodeMatrixTrials(
        input.matrixA,
        trials
      );
      scannability.push(
        trialsToScannability(aTrials, input.expectedPayload, "matrixA")
      );
    }
    if (input.matrixB) {
      const bTrials = await deps.decode.decodeMatrixTrials(
        input.matrixB,
        trials
      );
      scannability.push(
        trialsToScannability(
          bTrials,
          input.expectedPayloadB ?? input.expectedPayload,
          "matrixB"
        )
      );
    }

    if (input.renderedImage && deps.decode.decodeImageData) {
      const rTrials = await deps.decode.decodeImageData(
        input.renderedImage,
        trials
      );
      scannability.push(
        trialsToScannability(rTrials, input.expectedPayload, "rendered")
      );
    }
  }

  if (scannability.length > 0) {
    report.scannability = scannability;
    const primary = scannability[0];
    pushMetric(metrics, {
      id: "scannability.successRate",
      value: primary.successRate,
      unit: "ratio",
      direction: "higherBetter",
    });
    if (primary.payloadMatchRate != null) {
      pushMetric(metrics, {
        id: "scannability.payloadMatchRate",
        value: primary.payloadMatchRate,
        unit: "ratio",
        direction: "higherBetter",
      });
    }

    const rateForWarning =
      scannability.find((s) => s.source === "rendered")?.successRate ??
      primary.successRate;
    report.scannabilityWarning =
      rateForWarning < threshold
        ? `Decode success rate ${(rateForWarning * 100).toFixed(0)}% is below the ${(threshold * 100).toFixed(0)}% threshold. The QR code may not scan reliably.`
        : null;
  }

  return report;
}
