import { describe, it, expect } from "vitest";
import {
  calculateMaskPenalty,
  calculatePenalty,
  computeVisualFidelity,
  computeRsRemainingBudget,
  evaluateGeneratedQr,
  diffReports,
} from "@/domain/evaluate";
import { getEncodedMessage, getCodewords } from "@/domain/qr";
import { getMatrix } from "@/domain/qr/matrix";
import type { Input } from "@/state/inputs/types";
import type { QRMatrix, QRModule } from "@/domain/shared/types";

function sampleInput(data = "HI"): Input {
  return { id: "t1", type: "string", mode: "byte", data };
}

function makeMatrix(dimension: number, fill: (x: number, y: number) => boolean): QRMatrix {
  const matrix: QRMatrix = [];
  for (let y = 0; y < dimension; y++) {
    matrix[y] = [];
    for (let x = 0; x < dimension; x++) {
      matrix[y][x] = {
        id: `${x},${y}`,
        bitId: `b-${x}-${y}`,
        bit: { id: `b-${x}-${y}`, value: fill(x, y) ? 1 : 0, sourceId: "t" },
        x,
        y,
        isDark: fill(x, y),
        isMasked: false,
        type: "data",
        nonData: false,
      } as QRModule;
    }
  }
  return matrix;
}

describe("maskPenalty", () => {
  it("returns N1–N4 breakdown and total matching calculatePenalty", () => {
    const matrix = makeMatrix(21, (x, y) => (x + y) % 2 === 0);
    const breakdown = calculateMaskPenalty(matrix);
    expect(breakdown.total).toBe(
      breakdown.n1 + breakdown.n2 + breakdown.n3 + breakdown.n4
    );
    expect(calculatePenalty(matrix)).toBe(breakdown.total);
  });

  it("scores Rule 3 with light separators", () => {
    // Row of lights then finder pattern 1011101 then lights
    const matrix = makeMatrix(21, () => false);
    const pattern = [1, 0, 1, 1, 1, 0, 1];
    const start = 4;
    for (let i = 0; i < 4; i++) {
      matrix[0][start - 1 - i]!.isDark = false;
    }
    for (let i = 0; i < 7; i++) {
      matrix[0][start + i]!.isDark = pattern[i] === 1;
    }
    for (let i = 0; i < 4; i++) {
      matrix[0][start + 7 + i]!.isDark = false;
    }
    const { n3 } = calculateMaskPenalty(matrix);
    expect(n3).toBeGreaterThanOrEqual(40);
  });
});

describe("visual fidelity", () => {
  it("identical polarity scores MAE 0 and agreement 1", () => {
    const dim = 5;
    const matrix = makeMatrix(dim, (x, y) => (x + y) % 2 === 0);
    const target = new Float32Array(dim * dim);
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        target[y * dim + x] = matrix[y][x]!.isDark ? 0 : 1;
      }
    }
    const v = computeVisualFidelity(matrix, target, dim);
    expect(v.meanAbsoluteError).toBe(0);
    expect(v.polarityAgreement).toBe(1);
    expect(v.mismatchCount).toBe(0);
  });

  it("contrast-weighted error is defined when contrast grid provided", () => {
    const dim = 5;
    const matrix = makeMatrix(dim, () => true);
    const target = new Float32Array(dim * dim).fill(1);
    const contrast = new Float32Array(dim * dim).fill(10);
    contrast[0] = 100;
    const v = computeVisualFidelity(matrix, target, dim, contrast);
    expect(v.contrastWeightedError).not.toBeNull();
    expect(v.polarityAgreement).toBe(0);
  });
});

describe("evaluateGeneratedQr + diffReports", () => {
  it("fills structure and scannability for a standard QR", async () => {
    const encoded = getEncodedMessage([sampleInput("HELLO")], -1, 0);
    const { codewords, blocks } = getCodewords(
      encoded.segments,
      encoded.version,
      0
    );
    const { matrix, dataMask } = getMatrix(codewords, -1, encoded.version, 0);

    const report = await evaluateGeneratedQr(
      {
        matrix,
        version: encoded.version,
        errorCorrectionLevel: 0,
        dataMask,
        blocks,
        decodeTrials: 1,
      },
      {
        decode: {
          async decodeMatrixTrials() {
            return [{ success: true, payload: "HELLO" }];
          },
        },
      }
    );

    expect(report.structure?.penalty.total).toBeGreaterThanOrEqual(0);
    expect(report.reedSolomon?.allOk).toBe(true);
    expect(report.reedSolomon!.remainingBudget).toBeGreaterThan(0);
    expect(report.scannability?.[0].successRate).toBe(1);
    expect(
      report.metrics.find((m) => m.id === "structure.penalty.total")
    ).toBeTruthy();
  });

  it("diffReports signs improvements by direction", async () => {
    const a = await evaluateGeneratedQr(
      {
        matrix: makeMatrix(21, () => false),
        decodeTrials: 1,
      },
      {
        decode: {
          async decodeMatrixTrials() {
            return [{ success: true, payload: "A" }];
          },
        },
      }
    );
    const b = await evaluateGeneratedQr(
      {
        matrix: makeMatrix(21, (x, y) => (x + y) % 3 === 0),
        decodeTrials: 1,
      },
      {
        decode: {
          async decodeMatrixTrials() {
            return [{ success: true, payload: "A" }];
          },
        },
      }
    );
    // Force metric values for a clear delta
    a.metrics = [
      {
        id: "visual.polarityAgreement",
        value: 0.5,
        unit: "ratio",
        direction: "higherBetter",
      },
      {
        id: "structure.penalty.total",
        value: 100,
        unit: "score",
        direction: "lowerBetter",
      },
    ];
    b.metrics = [
      {
        id: "visual.polarityAgreement",
        value: 0.9,
        unit: "ratio",
        direction: "higherBetter",
      },
      {
        id: "structure.penalty.total",
        value: 40,
        unit: "score",
        direction: "lowerBetter",
      },
    ];
    const diff = diffReports(a, b);
    const polar = diff.deltas.find((d) => d.id === "visual.polarityAgreement");
    const pen = diff.deltas.find((d) => d.id === "structure.penalty.total");
    expect(polar!.signedImprovement).toBeCloseTo(0.4);
    expect(pen!.signedImprovement).toBeCloseTo(60);
  });
});

describe("computeRsRemainingBudget", () => {
  it("clean blocks report remaining === t", () => {
    const encoded = getEncodedMessage([sampleInput("OK")], 1, 0);
    const { blocks } = getCodewords(encoded.segments, encoded.version, 0);
    const summary = computeRsRemainingBudget(blocks);
    expect(summary.allOk).toBe(true);
    for (const b of summary.blocks) {
      expect(b.errorsCorrected).toBe(0);
      expect(b.remaining).toBe(b.t);
    }
  });
});
